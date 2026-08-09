"""Typed API models. These define the response shape the frontend's TypeScript
types mirror -- if a field changes here it must change in frontend/src/types.ts.
"""
from pydantic import BaseModel


class Component(BaseModel):
    id: str
    name: str
    short: str
    description: str
    connects_to: list[str]
    facts: list[str]


class CpuLayer(BaseModel):
    id: str
    name: str
    description: str
    scale: str


class PipelineStage(BaseModel):
    id: str
    name: str
    description: str
    unit: str


class ArchUnit(BaseModel):
    id: str
    name: str
    description: str


class SoftwareLayer(BaseModel):
    id: str
    name: str
    layer: int
    description: str
    reaches: str


class Architecture(BaseModel):
    cpu_layers: list[CpuLayer]
    pipeline: list[PipelineStage]
    units: list[ArchUnit]
    software_stack: list[SoftwareLayer]


class Tweak(BaseModel):
    id: str
    category: str
    name: str
    description: str
    tier: str
    needs_reboot: bool


class OptimizationGroup(BaseModel):
    """Tweaks grouped by the subsystem they affect, so the 3D scene can
    highlight the component a category maps to."""
    category: str
    component_id: str | None
    count: int
    tweaks: list[Tweak]


class VoidtuneInfo(BaseModel):
    name: str
    version: str
    edition: str
    platform: str
    license: str
    repo: str
    summary: str
    what_it_does: list[str]
    what_it_does_not_do: list[str]
    total_tweaks: int


class SystemSnapshot(BaseModel):
    """Simulated telemetry for the dashboard. `simulated` is always True --
    the frontend labels the panel from this field rather than hardcoding it,
    so it cannot silently start presenting fake data as real."""
    simulated: bool
    cpu_usage: float
    cpu_frequency_ghz: float
    cores: list[float]
    ram_used_gb: float
    ram_total_gb: float
    gpu_usage: float
    vram_used_gb: float
    vram_total_gb: float
    storage_read_mbs: float
    storage_write_mbs: float
    network_mbps: float


class HostInfo(BaseModel):
    """Real values read from this machine by the C helper, when available."""
    available: bool
    source: str
    fields: dict[str, str]
