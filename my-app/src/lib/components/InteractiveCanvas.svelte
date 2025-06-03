<script lang="ts">
  import { onMount, onDestroy } from 'svelte';

  export let imageUrl: string = '';
  export let width: number = 400;
  export let height: number = 400;
  export let intensity: number = 0.1; // Animation intensity
  export let rippleSpeed: number = 2.0; // Speed of ripple effect



  let canvas: HTMLCanvasElement;
  let gl: WebGLRenderingContext | null = null;
  let program: WebGLProgram | null = null;
  let animationId: number;
  let mouseX = 0.5;
  let mouseY = 0.5;
  let targetMouseX = 0.5;
  let targetMouseY = 0.5;
  let time = 0;
  let texture: WebGLTexture;
  let isImageLoaded = false;
  let isHovering = false;
  let hoverIntensity = 0.0; // Smooth transition value

  // Vertex shader source
  const vertexShaderSource = `
    attribute vec2 a_position;
    attribute vec2 a_texCoord;
    varying vec2 v_texCoord;

    void main() {
      gl_Position = vec4(a_position, 0.0, 1.0);
      v_texCoord = a_texCoord;
    }
  `;

  // Fragment shader source with interactive effects
  const fragmentShaderSource = `
    precision mediump float;

    uniform sampler2D u_texture;
    uniform vec2 u_mouse;
    uniform float u_time;
    uniform float u_intensity;
    uniform float u_rippleSpeed;
    uniform vec2 u_resolution;

    varying vec2 v_texCoord;

    void main() {
      // Flip Y coordinate to fix upside-down image
      vec2 uv = vec2(v_texCoord.x, 1.0 - v_texCoord.y);

      // Calculate distance from mouse (mouse coordinates are already flipped)
      vec2 mousePos = u_mouse;
      float dist = distance(uv, mousePos);

      // Create ripple effect with consistent wave spacing (capped frequency and time)
      float maxFreq = 3.0;
      float rippleFreq = min(dist * 6.0, maxFreq);
      float cappedRippleTime = mod(u_time * u_rippleSpeed, 6.28318); // Cap ripple time at 2*PI
      float ripple = sin(rippleFreq - cappedRippleTime) * 0.02 * u_intensity;

      // Create noticeable displacement based on mouse proximity
      vec2 toMouse = uv - mousePos;
      float mouseDist = length(toMouse);
      vec2 displacement = vec2(0.0);

      if (mouseDist < 1.2) {
        // Softer influence with even larger radius
        float influence = exp(-mouseDist * 1.8);

        // Multiple displacement effects
        vec2 rippleDisplacement = normalize(toMouse) * ripple * influence;

        // Add swirl effect with capped time progression
        float cappedSwirlTime = mod(u_time * 0.5, 6.28318); // Cap swirl time at 2*PI
        float angle = atan(toMouse.y, toMouse.x) + cappedSwirlTime * influence;
        vec2 swirlDisplacement = vec2(cos(angle), sin(angle)) * 0.015 * influence * u_intensity;

        // Combine displacements
        displacement = rippleDisplacement + swirlDisplacement;
      }

      // Apply displacement (removed idle wave animation)
      vec2 distortedUV = uv + displacement;

      // Sample texture with distorted coordinates
      vec4 color = texture2D(u_texture, distortedUV);

      // Add noticeable color effects based on mouse proximity
      if (mouseDist < 0.9) {
        float colorInfluence = exp(-mouseDist * 2.2);

        // Chromatic aberration effect
        float aberration = 0.005 * colorInfluence * u_intensity;
        vec4 colorR = texture2D(u_texture, distortedUV + vec2(aberration, 0.0));
        vec4 colorG = texture2D(u_texture, distortedUV);
        vec4 colorB = texture2D(u_texture, distortedUV - vec2(aberration, 0.0));

        color = vec4(colorR.r, colorG.g, colorB.b, color.a);

        // Add color tint
        float colorShift = colorInfluence * 0.15 * u_intensity;
        color.rgb += vec3(colorShift * 0.3, colorShift * 0.1, colorShift * 0.4);

        // Add brightness boost
        color.rgb *= (1.0 + colorInfluence * 0.2 * u_intensity);
      }

      gl_FragColor = color;
    }
  `;

  function createShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
    const shader = gl.createShader(type);
    if (!shader) return null;

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('Shader compilation error:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }

    return shader;
  }

  function createProgram(gl: WebGLRenderingContext, vertexShader: WebGLShader, fragmentShader: WebGLShader): WebGLProgram | null {
    const program = gl.createProgram();
    if (!program) return null;

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program linking error:', gl.getProgramInfoLog(program));
      gl.deleteProgram(program);
      return null;
    }

    return program;
  }

  function loadTexture(gl: WebGLRenderingContext, url: string): Promise<WebGLTexture> {
    return new Promise((resolve, reject) => {
      const texture = gl.createTexture();
      if (!texture) {
        reject(new Error('Failed to create texture'));
        return;
      }

      const image = new Image();
      image.crossOrigin = 'anonymous';

      image.onload = () => {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

        // Set texture parameters
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

        isImageLoaded = true;
        resolve(texture);
      };

      image.onerror = () => {
        reject(new Error('Failed to load image'));
      };

      image.src = url;
    });
  }

  function setupGeometry(gl: WebGLRenderingContext, program: WebGLProgram) {
    // Create a quad that covers the entire canvas
    const positions = new Float32Array([
      -1, -1,  0, 0,
       1, -1,  1, 0,
      -1,  1,  0, 1,
       1,  1,  1, 1,
    ]);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    const positionLocation = gl.getAttribLocation(program, 'a_position');
    const texCoordLocation = gl.getAttribLocation(program, 'a_texCoord');

    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 16, 0);

    gl.enableVertexAttribArray(texCoordLocation);
    gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 16, 8);
  }

  function render() {
    if (!gl || !program || !isImageLoaded) return;

    // Smooth transition for hover intensity with different speeds
    const fadeInSpeed = 0.08;   // Slightly slower fade in
    const fadeOutSpeed = 0.03;  // Much slower fade out

    if (isHovering) {
      hoverIntensity = Math.min(1.0, hoverIntensity + fadeInSpeed);
      time += 0.016; // Only update time when hovering
    } else {
      hoverIntensity = Math.max(0.0, hoverIntensity - fadeOutSpeed);
    }

    // Smooth mouse position interpolation
    const lerpSpeed = 0.15;
    mouseX += (targetMouseX - mouseX) * lerpSpeed;
    mouseY += (targetMouseY - mouseY) * lerpSpeed;

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(program);

    // Set uniforms
    const mouseLocation = gl.getUniformLocation(program, 'u_mouse');
    const timeLocation = gl.getUniformLocation(program, 'u_time');
    const intensityLocation = gl.getUniformLocation(program, 'u_intensity');
    const rippleSpeedLocation = gl.getUniformLocation(program, 'u_rippleSpeed');
    const resolutionLocation = gl.getUniformLocation(program, 'u_resolution');
    const textureLocation = gl.getUniformLocation(program, 'u_texture');

    gl.uniform2f(mouseLocation, mouseX, mouseY);
    gl.uniform1f(timeLocation, time);
    gl.uniform1f(intensityLocation, intensity * hoverIntensity); // Apply smooth intensity
    gl.uniform1f(rippleSpeedLocation, rippleSpeed);
    gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
    gl.uniform1i(textureLocation, 0);

    // Bind texture
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);

    // Draw
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    animationId = requestAnimationFrame(render);
  }

  function handleMouseMove(event: MouseEvent) {
    const rect = canvas.getBoundingClientRect();
    targetMouseX = (event.clientX - rect.left) / rect.width;
    targetMouseY = (event.clientY - rect.top) / rect.height;
    isHovering = true;
  }

  function handleMouseEnter() {
    isHovering = true;
  }

  function handleMouseLeave() {
    isHovering = false;
    // Smoothly return to center
    targetMouseX = 0.5;
    targetMouseY = 0.5;
  }

  async function initWebGL() {
    if (!canvas) return;

    const context = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!context) return;

    gl = context as WebGLRenderingContext;

    // Create shaders
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

    if (!vertexShader || !fragmentShader) return;

    // Create program
    program = createProgram(gl, vertexShader, fragmentShader);
    if (!program) return;

    // Setup geometry
    setupGeometry(gl, program);

    // Load texture if image URL is provided
    if (imageUrl) {
      try {
        texture = await loadTexture(gl, imageUrl);
        render();
      } catch (error) {
        console.error('Failed to load texture:', error);
      }
    }
  }

  onMount(() => {
    if (canvas) {
      canvas.width = width;
      canvas.height = height;
      initWebGL();
    }
  });

  onDestroy(() => {
    if (animationId) {
      cancelAnimationFrame(animationId);
    }
  });
</script>

<canvas
  bind:this={canvas}
  {width}
  {height}
  on:mousemove={handleMouseMove}
  on:mouseenter={handleMouseEnter}
  on:mouseleave={handleMouseLeave}
  class="interactive-canvas"
></canvas>

<style>
  .interactive-canvas {
    border-radius: 8px;
    display: block;
    width: 150px;
    height: 150px;
    min-width: 150px;
    min-height: 150px;
    max-width: 150px;
    max-height: 150px;
  }
</style>
