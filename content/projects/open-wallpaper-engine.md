[project]
name = "open-wallpaper-engine"
tagline = "A Wallpaper Engine client for Linux and macOS, written in Rust."
link = "https://github.com/code-wolf-byte/open-wallpaper-engine"
status = "active"
year = "2026"
stack = ["Rust", "wgpu", "WGSL", "FFmpeg"]

[content]
Plays Steam Workshop wallpapers on the desktop: animated scene wallpapers
rendered through a `wgpu` pass pipeline, plus video, image and web wallpapers.
It reads Wallpaper Engine's own formats directly (`scene.json`, `.pkg`
archives, `.tex` textures, `.mdl` models), so Workshop items you already own
work as they are.

- Full effect pass chaining: ping-pong FBOs, named render targets, multi-pass effects and the bloom chain
- Workshop GLSL compiled to SPIR-V and translated to WGSL at load time
- Every particle emitter, initializer, operator and renderer type the Workshop uses
- Audio-reactive wallpapers: desktop audio captured and FFT'd into shader uniforms
- SceneScript property scripting, skinned `.mdl` puppets and 3D perspective scenes
- Native presentation on Wayland with no readback, plus X11, macOS and a CPU fallback

The scene renderer is a port of
[linux-wallpaperengine](https://github.com/Almamu/linux-wallpaperengine).
