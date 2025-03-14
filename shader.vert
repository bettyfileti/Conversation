// Vertex position attribute
attribute vec3 aPosition;

// Texture coordinate attribute
attribute vec2 aTexCoord;

// Varying to pass texture coordinates to fragment shader
varying vec2 vTexCoord;

void main() {
    // Copy the texture coordinates
    vTexCoord = aTexCoord;
    
    // Convert position to clip space
    vec4 positionVec4 = vec4(aPosition, 1.0);
    positionVec4.xy = positionVec4.xy * 2.0 - 1.0;
    
    // Set the vertex position
    gl_Position = positionVec4;
}