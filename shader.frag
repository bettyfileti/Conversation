precision mediump float;

// Texture coordinates from vertex shader
varying vec2 vTexCoord;

// Input texture with our shape
uniform sampler2D texture;

// Canvas resolution (for more precise edge calculations)
uniform vec2 resolution;

// Edge blur control parameters
uniform float edgeWidth; // Width of the blur effect
uniform float blurAmount; // Intensity of the blur effect
uniform float time; // Time for subtle animation

void main() {
    // Flip the texture coordinates (p5.js textures are flipped by default)
    vec2 uv = vec2(vTexCoord.x, 1.0 - vTexCoord.y);
    
    // Sample the texture at the current position
    vec4 centerColor = texture2D(texture, uv);
    
    // Calculate normalized distance from each edge (0 = at edge, 1 = far from edge)
    float distFromLeft = uv.x / edgeWidth;
    float distFromRight = (1.0 - uv.x) / edgeWidth;
    float distFromTop = uv.y / edgeWidth;
    float distFromBottom = (1.0 - uv.y) / edgeWidth;
    
    // Clamp distances to 0-1 range
    distFromLeft = clamp(distFromLeft, 0.0, 1.0);
    distFromRight = clamp(distFromRight, 0.0, 1.0);
    distFromTop = clamp(distFromTop, 0.0, 1.0);
    distFromBottom = clamp(distFromBottom, 0.0, 1.0);
    
    // Get minimum distance to any edge
    float edgeFactor = min(min(distFromLeft, distFromRight), min(distFromTop, distFromBottom));
    
    // Apply a smoother transition curve (cubic smoothstep)
    // This helps reduce visible artifacts in the blur pattern
    edgeFactor = smoothstep(0.0, 1.0, edgeFactor);
    
    // If we're not near an edge, just use the original texture color
    if (edgeFactor >= 1.0) {
        gl_FragColor = centerColor;
        return;
    }
    
    // Calculate blur amount based on edge proximity with subtle animation
    // Use a quadratic curve to make blur intensity increase more dramatically closer to the edge
    float timeFactor = sin(time * 2.0) * 0.1 + 1.0; // varies between 0.9 and 1.1
    float proximityFactor = pow(1.0 - edgeFactor, 2.0); // Quadratic increase (more blur very close to edge)
    float blur = proximityFactor * blurAmount * timeFactor;
    
    // Sample using a rotated pattern to reduce visible grid artifacts
    vec4 blurredColor = vec4(0.0);
    float totalWeight = 0.0;
    
    // Use a circular pattern rather than a grid for smoother results
    // This uses fewer samples but distributes them better
    const int NUM_SAMPLES = 13;  // A good balance of quality and performance
    
    // Sample offsets in a circular pattern (pre-computed)
    // These points are distributed more evenly than a grid
    vec2 offsets[13];
    offsets[0] = vec2(0.0, 0.0);                 // Center
    offsets[1] = vec2(1.0, 0.0);                 // Right
    offsets[2] = vec2(0.7071, 0.7071);           // Top-right
    offsets[3] = vec2(0.0, 1.0);                 // Top
    offsets[4] = vec2(-0.7071, 0.7071);          // Top-left
    offsets[5] = vec2(-1.0, 0.0);                // Left
    offsets[6] = vec2(-0.7071, -0.7071);         // Bottom-left
    offsets[7] = vec2(0.0, -1.0);                // Bottom
    offsets[8] = vec2(0.7071, -0.7071);          // Bottom-right
    offsets[9] = vec2(0.3827, 0.9239);           // Additional points for smoother gradient
    offsets[10] = vec2(-0.3827, 0.9239);
    offsets[11] = vec2(-0.9239, -0.3827);
    offsets[12] = vec2(0.9239, -0.3827);
    
    // Sample with the pattern
    for (int i = 0; i < NUM_SAMPLES; i++) {
        // Scale the offset by blur amount
        vec2 offset = offsets[i] * blur / resolution;
        
        // Sample the texture at the offset position
        vec4 sampleColor = texture2D(texture, uv + offset);
        
        // Calculate weight based on distance from center
        float dist = length(offsets[i]);
        float weight = 1.0 / (1.0 + dist * 1.5);
        
        // Add weighted sample to total
        blurredColor += sampleColor * weight;
        totalWeight += weight;
    }
    
    // Normalize the blurred color
    blurredColor /= totalWeight;
    
    // Apply a smoother blend to reduce visible transition artifacts
    // Make the blend factor also increase more dramatically near the edges
    float blendFactor = pow(1.0 - edgeFactor, 1.5); // Less aggressive than blur but still progressive
    blendFactor = smoothstep(0.0, 1.0, blendFactor);
    
    gl_FragColor = mix(centerColor, blurredColor, blendFactor);
}