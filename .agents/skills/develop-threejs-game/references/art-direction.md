# Art Direction and World Composition

## Start with a visual thesis

Write one sentence that defines mood, shape language, palette, surface treatment, and motion character. Example: “A low, heavy industrial maze built from beveled slabs, sodium-orange navigation light, cold blue machinery, and short mechanical bursts.”

Choose a limited set of reusable material roles:

- world base
- structural secondary
- interactive neutral
- objective/reward
- hazard/damage
- accent/emissive
- atmosphere/background

Roles should remain recognizable across geometry, lighting, particles, and UI.

## Author silhouettes

Recognize gameplay families before modeling: player, enemy, hazard, pickup, objective, cover, boundary, and navigation landmark. Give each family a distinct silhouette at gameplay distance.

- Combine primitives into purposeful forms with hierarchy, proportion, bevels, recesses, supports, and asymmetry.
- Prefer a few strong landmarks over many interchangeable props.
- Vary repeated forms through controlled modules, not random scale and color alone.
- Verify recognition in flat lighting before adding bloom, particles, labels, or outlines.

Primitive-dominant scenes fail review when most meaningful objects remain visually equivalent to untouched boxes, spheres, cylinders, or planes.

## Compose the world in layers

Build from near to far:

1. playable surface and collision-reading boundaries
2. primary architecture that frames routes and arenas
3. gameplay landmarks and interactive object families
4. secondary props and edge detail
5. distant silhouettes, sky, or backdrop
6. atmosphere and restrained VFX

Sparse space is acceptable only when clearly intentional and supported by scale, lighting, background design, and focal composition.

## Camera and lighting

- Select the camera for gameplay readability first. Establish a stable horizon, useful depth cues, and predictable framing.
- Keep important objects inside the effective contrast range of the camera.
- Use one dominant lighting idea plus local support. Too many equal-strength lights flatten hierarchy.
- Reserve emissive intensity and bloom for priority events and interactables.
- Avoid shadow settings whose cost is not visible at gameplay distance.

## Motion and effects

- Add idle, anticipation, action, impact, recovery, and state-change motion where the gameplay benefits.
- Trigger particles, flashes, trails, camera impulses, and material pulses from events.
- Keep effects short enough to preserve object readability and input feedback.
- Do not use fog, bloom, chromatic effects, noise, or particles to mask unfinished geometry.

## UI and world cohesion

Use the same color roles, typography attitude, icon shapes, and motion timing in HUD and world. Keep the central play area clear. Information should be readable at 1280×720 without covering threats, objectives, or navigation.
