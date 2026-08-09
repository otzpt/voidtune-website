r"""Parses VOIDTUNE's C# tweak catalog into JSON.

The website's VOIDTUNE section must describe what the app actually does, not an
invented feature list -- so the source of truth is TweakCatalog.cs in the
VOIDTUNE repo itself. Re-run this when the catalog changes:

    python3 extract_catalog.py /path/to/VOIDTUNE > data/tweaks.json

Object bodies are located with a brace-depth scan rather than a regex: the
tweak commands embed literal braces (registry class GUIDs like
{4d36e968-e325-...}), so a non-greedy `\{(.*?)\}` cuts entries in half. The
scan skips over string literals so braces inside them never move the depth.
Fields inside a located body are then read with plain regexes -- every one is
a literal in a consistent shape.
"""
import json
import re
import sys
from pathlib import Path

# Fields appear in a stable order in the catalog, but Tier/MinBuild/NeedsReboot
# are sometimes absent, so each is captured independently off the same object.
FIELD_RE = {
    'id': re.compile(r'\bId\s*=\s*"([^"]*)"'),
    'category': re.compile(r'\bCategory\s*=\s*"([^"]*)"'),
    'name': re.compile(r'\bName\s*=\s*"([^"]*)"'),
    # Verbatim strings (@"...") use "" as an escaped quote; descriptions are
    # normal strings, but a few contain doubled quotes copied from one.
    'description': re.compile(r'\bDescription\s*=\s*"((?:[^"]|"")*)"'),
    'tier': re.compile(r'\bTier\s*=\s*TweakTier\.(\w+)'),
}
REBOOT_RE = re.compile(r'\bNeedsReboot\s*=\s*true')


def object_bodies(source: str):
    """Yields the text between the braces of each `new() { ... }` initialiser."""
    for match in re.finditer(r'new\(\)\s*\{', source):
        i = match.end()
        depth = 1
        while i < len(source) and depth:
            char = source[i]
            if char == '"':
                # Skip the whole string literal. "" inside one is an escaped
                # quote (both plain and @-verbatim strings use that form here),
                # so a doubled quote continues the string rather than ending it.
                i += 1
                while i < len(source):
                    if source[i] == '"':
                        if source[i + 1:i + 2] == '"':
                            i += 2
                            continue
                        break
                    i += 1
            elif char == '{':
                depth += 1
            elif char == '}':
                depth -= 1
                if not depth:
                    break
            i += 1
        yield source[match.end():i]


def parse(source: str) -> list[dict]:
    tweaks = []
    for body in object_bodies(source):
        fields = {}
        for key, pattern in FIELD_RE.items():
            found = pattern.search(body)
            if found:
                fields[key] = found.group(1).replace('""', '"')
        # An object without an Id/Name isn't a tweak (the file also builds
        # groups and blocks with the same `new() {}` syntax).
        if 'id' not in fields or 'name' not in fields:
            continue
        fields.setdefault('tier', 'Safe')
        fields.setdefault('description', '')
        fields.setdefault('category', 'Other')
        fields['needs_reboot'] = bool(REBOOT_RE.search(body))
        tweaks.append(fields)
    return tweaks


def main() -> None:
    repo = Path(sys.argv[1] if len(sys.argv) > 1 else Path.home() / 'Projectos/VOIDTUNE')
    catalog = repo / 'VOIDTUNE.WinUI/Services/TweakCatalog.cs'
    tweaks = parse(catalog.read_text(encoding='utf-8'))
    # The real catalog is ~170 tweaks; anything far below that means the regex
    # stopped matching the file's shape and the output would be quietly wrong.
    assert len(tweaks) > 100, f'only parsed {len(tweaks)} tweaks -- catalog format likely changed'
    json.dump(tweaks, sys.stdout, indent=2, ensure_ascii=False)


if __name__ == '__main__':
    main()
