/*
 * cpuinfo -- reports this machine's real CPU topology and cache hierarchy,
 * and measures memory latency across working-set sizes. Emits JSON on stdout
 * for the FastAPI backend to serve.
 *
 * This exists in C because it does two things the rest of the stack cannot do
 * honestly: read the cache topology the kernel exposes, and time individual
 * dependent memory loads. The latency walk is the point -- it demonstrates the
 * cache hierarchy by measurement rather than by assertion, so the website can
 * show where L1/L2/L3/DRAM actually sit on THIS machine instead of quoting
 * textbook numbers.
 *
 * Linux-specific: reads /sys/devices/system/cpu. Prints "available": false
 * with a reason on any other platform rather than guessing.
 *
 * Build: cc -O2 -o cpuinfo cpuinfo.c
 */
#define _POSIX_C_SOURCE 199309L
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include <unistd.h>

/* Working set sizes to probe, in KB. Chosen to straddle typical L1 (32-48K),
 * L2 (256K-2M), L3 (8-32M) and main memory boundaries so the jumps between
 * levels land visibly between samples. */
static const size_t PROBE_KB[] = {4, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768, 65536};
#define PROBE_COUNT (sizeof(PROBE_KB) / sizeof(PROBE_KB[0]))

static long read_sys_long(const char *path) {
    FILE *f = fopen(path, "r");
    if (!f) return -1;
    long value = -1;
    if (fscanf(f, "%ld", &value) != 1) value = -1;
    fclose(f);
    return value;
}

/* Cache size files read as e.g. "32K" or "16M", so scanf("%ld") alone would
 * silently drop the unit and report 16 for a 16M cache. */
static long read_cache_size_kb(const char *path) {
    FILE *f = fopen(path, "r");
    if (!f) return -1;
    long value;
    char unit = 0;
    int matched = fscanf(f, "%ld%c", &value, &unit);
    fclose(f);
    if (matched < 1) return -1;
    if (unit == 'M') return value * 1024;
    return value; /* K, or unitless (already KB) */
}

/*
 * Pointer-chases through a shuffled cycle covering the whole buffer. Each load
 * depends on the previous one's result, so the CPU cannot overlap them -- the
 * measured time is real per-access latency, not bandwidth. A sequential walk
 * would instead measure the prefetcher and show almost no cache boundaries.
 */
static double measure_latency_ns(size_t bytes) {
    size_t count = bytes / sizeof(size_t);
    if (count < 2) return -1.0;

    size_t *buffer = malloc(bytes);
    if (!buffer) return -1.0;

    /* Build an index permutation, then link it into a single cycle. */
    for (size_t i = 0; i < count; i++) buffer[i] = i;
    for (size_t i = count - 1; i > 0; i--) {
        size_t j = (size_t)rand() % (i + 1);
        size_t tmp = buffer[i];
        buffer[i] = buffer[j];
        buffer[j] = tmp;
    }
    /* buffer currently holds a permutation of indices; turn it into a chain
     * where each slot stores the index of the next slot to visit. */
    size_t *order = malloc(count * sizeof(size_t));
    if (!order) { free(buffer); return -1.0; }
    memcpy(order, buffer, count * sizeof(size_t));
    for (size_t i = 0; i < count; i++) buffer[order[i]] = order[(i + 1) % count];
    free(order);

    /* Warm the buffer so the measured pass isn't dominated by page faults. */
    size_t index = 0;
    for (size_t i = 0; i < count; i++) index = buffer[index];

    const size_t steps = count * 4 < 2000000 ? 2000000 : count * 4;
    struct timespec start, end;
    clock_gettime(CLOCK_MONOTONIC, &start);
    for (size_t i = 0; i < steps; i++) index = buffer[index];
    clock_gettime(CLOCK_MONOTONIC, &end);

    /* Consume `index` so the optimiser cannot delete the whole loop. */
    volatile size_t sink = index;
    (void)sink;

    double elapsed_ns = (double)(end.tv_sec - start.tv_sec) * 1e9
                      + (double)(end.tv_nsec - start.tv_nsec);
    free(buffer);
    return elapsed_ns / (double)steps;
}

int main(int argc, char **argv) {
    int with_latency = (argc > 1 && strcmp(argv[1], "--latency") == 0);

    long cores = sysconf(_SC_NPROCESSORS_ONLN);
    long page_size = sysconf(_SC_PAGESIZE);
    long line_size = read_sys_long("/sys/devices/system/cpu/cpu0/cache/index0/coherency_line_size");

    if (cores < 0) {
        printf("{\"available\":false,\"reason\":\"sysconf unavailable on this platform\"}\n");
        return 0;
    }

    printf("{\n  \"available\": true,\n  \"source\": \"c/cpuinfo (sysconf + /sys/devices/system/cpu)\",\n");
    printf("  \"cores_online\": %ld,\n", cores);
    printf("  \"page_size_bytes\": %ld,\n", page_size);
    printf("  \"cache_line_bytes\": %ld,\n", line_size);

    printf("  \"caches\": [");
    int printed = 0;
    for (int i = 0; i < 5; i++) {
        char path[256];
        snprintf(path, sizeof(path), "/sys/devices/system/cpu/cpu0/cache/index%d/level", i);
        long level = read_sys_long(path);
        if (level < 0) continue;
        snprintf(path, sizeof(path), "/sys/devices/system/cpu/cpu0/cache/index%d/size", i);
        long size_kb = read_cache_size_kb(path);
        snprintf(path, sizeof(path), "/sys/devices/system/cpu/cpu0/cache/index%d/type", i);
        FILE *f = fopen(path, "r");
        char type[32] = "Unknown";
        if (f) { if (fscanf(f, "%31s", type) != 1) strcpy(type, "Unknown"); fclose(f); }
        printf("%s\n    {\"level\": %ld, \"type\": \"%s\", \"size_kb\": %ld}",
               printed ? "," : "", level, type, size_kb);
        printed = 1;
    }
    printf("\n  ]");

    if (with_latency) {
        srand(1); /* fixed seed: the shuffle should not change between runs */
        printf(",\n  \"latency\": [");
        for (size_t i = 0; i < PROBE_COUNT; i++) {
            double ns = measure_latency_ns(PROBE_KB[i] * 1024);
            if (ns < 0) continue;
            printf("%s\n    {\"working_set_kb\": %zu, \"latency_ns\": %.2f}",
                   i ? "," : "", PROBE_KB[i], ns);
            fflush(stdout);
        }
        printf("\n  ]");
    }

    printf("\n}\n");
    return 0;
}
