out vec2 vUv;
out vec3 vNormal;
out vec3 vPosition;

void main() {
    vNormal = normalize(normalMatrix * normal);
    vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
    vUv = position.xy;
}