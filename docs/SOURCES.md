# Sourcing

Where each claim on the site comes from, and what is not sourced.

## VOIDTUNE

Everything in the VOIDTUNE section comes from the project itself, not from
memory or invention:

| Claim | Source |
| --- | --- |
| Version, platform, licence, edition | `README.md` in [otzpt/VOIDTUNE](https://github.com/otzpt/VOIDTUNE) |
| 177 tweaks, names, descriptions, categories, tiers, reboot flags | `VOIDTUNE.WinUI/Services/TweakCatalog.cs`, parsed by `backend/extract_catalog.py` |
| Reversible tweaks with explicit revert commands | Every catalog entry has both `ApplyCmd` and `RevertCmd`; the `Tweak` model requires them |
| Hardware/OS gating | `TweakCatalog.Build()` filters on `HardwareInfo.WinBuild`; `ArchTweaks()` gates on `CpuVendor` / `GpuVendor` |
| Laptops treated differently, max-performance settings hurting thermally limited machines | Comments in `TweakCatalog.cs` around `ix1`/`nx1`, and the v0.8.14 release notes (field-confirmed on an i7-8750H) |
| SAFE vs EXTREME tiers | `TweakTier` enum in `Models/Tweak.cs` |
| Verifies live system state at startup | `Services/TweakVerifier.cs`, and the v0.8.7 notes |
| Tweak Validator with thermal-throttle detection | v0.8.14 release notes |
| Does not patch the kernel or load a driver | Every command in the catalog is `reg`, `sc`, `powercfg`, or PowerShell — user-space configuration only |

The claim "it does not overclock" is a statement about what is absent from the
catalog: no entry writes clocks, voltages or memory timings.

## Hardware content

The component, CPU-layer, pipeline and software-stack text
(`backend/data/components.json`, `backend/data/architecture.json`) is written
for this project. It is standard computer-architecture material, deliberately
kept to claims that are stable and uncontroversial (cache hierarchy latency
ordering, LGA vs PGA, dual-channel population, ring 3 → ring 0 transitions).

Two places where the site explicitly marks its own limits rather than
overclaiming:

- The CPU layer stack is labelled SIMPLIFIED on screen. It is a conceptual
  ordering, not the floorplan of any shipping processor.
- The dashboard is labelled SIMULATED, driven by the `simulated` field in the
  API response rather than a hardcoded UI string.

## Measured data

`c/cpuinfo.c` reads `/sys/devices/system/cpu/cpu0/cache/*` for the topology and
times dependent loads for the latency curve. Both are measurements of the
machine that ran it, committed to `backend/data/hostinfo.json`. Re-run it to
replace them with your own:

```bash
cc -O2 -o c/cpuinfo c/cpuinfo.c && ./c/cpuinfo --latency > backend/data/hostinfo.json
```

The latency walk uses a shuffled pointer chase rather than a sequential scan on
purpose: a sequential walk measures the prefetcher and shows almost no cache
boundaries at all.
