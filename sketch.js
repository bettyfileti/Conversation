/*
 Coded with claude
 */

// Global variables
let theShader;
let shapeGraphics;
let backgroundGraphics; // Background buffer
let textBelowGraphics;  // Text layer below the blob
let seed;
let colorStart, colorEnd;
let shapePoints = [];
let targetPoints = [];
let easing = 0.05;
let initialRadius;
let words = ["every", "conversation", "changed", "me"];
let wordCounter = 0;
// Array to store text elements below the blob
let textBelowElements = [];

// Drag variables
let isDragging = false;
let draggedElement = null;
let startedOnBlob = false; // Records whether drag started on blob

function preload() {
  // Load the shader
  theShader = loadShader('shader.vert', 'shader.frag');
}

function setup() {

// Check if user is on mobile
let isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );

  if (isMobile) {
    // Create a mobile notice overlay
    let notice = document.createElement("div");
    notice.style.position = "fixed";
    notice.style.top = "5%";
    notice.style.left = "5%";
    notice.style.width = "80%";
    notice.style.height = "80%";
    notice.style.backgroundColor = "rgba(0,0,0,0.8)";
    notice.style.color = "white";
    notice.style.display = "flex";
    notice.style.alignItems = "center";
    notice.style.justifyContent = "center";
    notice.style.zIndex = "1000";
    notice.style.padding = "20px";
    notice.style.textAlign = "center";
    notice.style.fontFamily = "Alata";
    notice.innerHTML =
      "<p>Not *yet* set up for mobile.</br> Please try on a desktop device.</p>";
    document.body.appendChild(notice);
  }
  
  // Shaders require WEBGL mode to work
  createCanvas(windowWidth, windowHeight, WEBGL);
  
  // Create graphics buffers
  shapeGraphics = createGraphics(width, height);
  backgroundGraphics = createGraphics(width, height);
  textBelowGraphics = createGraphics(width, height);
  
  shapeGraphics.colorMode(HSB, 360, 100, 100);
  backgroundGraphics.colorMode(HSB, 360, 100, 100);
  textBelowGraphics.colorMode(HSB, 360, 100, 100);
  
  // Explicitly load the default font for text below
  textBelowGraphics.textFont('Arial');
  textBelowGraphics.textSize(18);
  
  // Set a random seed
  seed = random(1000);
  randomSeed(seed);
  noiseSeed(seed);
  
  // Define gradient colors
  colorStart = shapeGraphics.color(20, 40, 100);  // Warm color (top)
  colorEnd = shapeGraphics.color(300, 10, 100);   // Light pink (bottom)
  
  // Initialize shape points
  initializeShapePoints();
  
  // Create a container div for words if it doesn't exist
  if (!document.getElementById('word-container')) {
    let container = document.createElement('div');
    container.id = 'word-container';
    container.style.position = 'absolute';
    container.style.top = '0';
    container.style.left = '0';
    container.style.width = '100%';
    container.style.height = '100%';
    container.style.overflow = 'hidden';
    document.body.appendChild(container);
  }
}

function draw() {
  // Clear all graphics buffers
  backgroundGraphics.clear();
  textBelowGraphics.clear();
  shapeGraphics.clear();
  
  // 1. Draw background gradient
  drawGradientBackground();
  
  // 2. Draw text elements on the "below" layer
  drawTextBelow();
  
  // 3. Update and draw the blob shape
  updateShapePoints();
  drawBlobShape();
  
  // Reset everything
  resetShader();
  clear();
  
  // Render the layers in order
  // 1. Background layer first
  image(backgroundGraphics, -width/2, -height/2, width, height);
  
  // 2. Text below layer
  image(textBelowGraphics, -width/2, -height/2, width, height);
  
  // 3. Blob with shader on top
  theShader.setUniform("texture", shapeGraphics);
  theShader.setUniform("resolution", [width, height]);
  theShader.setUniform("edgeWidth", 0.60);
  theShader.setUniform("blurAmount", 2.0);
  theShader.setUniform("time", frameCount * 0.01);
  shader(theShader);
  rect(0, 0, width, height);
  
  // Text above is handled by DOM elements, so no need to render it here
}

// Draw the background gradient
function drawGradientBackground() {
  backgroundGraphics.push();
  
  // Draw gradient background
  for (let y = 0; y < height; y++) {
    let inter = map(y, 0, height, 0, 1);
    let c = backgroundGraphics.lerpColor(colorStart, colorEnd, inter);
    backgroundGraphics.stroke(c);
    backgroundGraphics.line(0, y, width, y);
  }
  
  backgroundGraphics.pop();
}

// Function to initialize shape points
function initializeShapePoints() {
  shapePoints = [];
  targetPoints = [];
  initialRadius = min(width, height) * 0.1;
  let radius = initialRadius;
  let numPoints = 12; // Original number of points
  
  for (let i = 0; i < numPoints; i++) {
    let a = map(i, 0, numPoints, 0, TWO_PI);
    
    // Initial radius
    let r = radius;
    
    // Store original angle and current radius
    let newPoint = {
      angle: a,
      radius: r,
      x: cos(a) * r,
      y: sin(a) * r,
      targetRadius: r,
      initialRadius: r // Store the initial radius for reference
    };
    
    shapePoints.push(newPoint);
    targetPoints.push({...newPoint});
  }
}

// Update shape points towards target positions
function updateShapePoints() {
  for (let i = 0; i < shapePoints.length; i++) {
    let point = shapePoints[i];
    let target = targetPoints[i];
    
    // Smoothly animate towards target
    point.radius += (target.targetRadius - point.radius) * easing;
    
    // Update x and y based on new radius
    point.x = cos(point.angle) * point.radius;
    point.y = sin(point.angle) * point.radius;
  }
}

// Draw text elements on the canvas below layer
function drawTextBelow() {
  textBelowGraphics.push();
  
  // Important: Reset text properties each frame for consistent rendering
  textBelowGraphics.textFont('Alata'); // Use just 'Arial' without fallback for consistency
  textBelowGraphics.textSize(18);
  textBelowGraphics.textAlign(CENTER, CENTER);
  
  // Draw each text element
  for (let element of textBelowElements) {
    textBelowGraphics.fill(0); // Black text
    textBelowGraphics.noStroke();
    textBelowGraphics.text(element.word, element.x, element.y);
  }
  
  textBelowGraphics.pop();
}

// Draw the blob shape
function drawBlobShape() {
  shapeGraphics.push();
  shapeGraphics.translate(width/2, height/2);
  
  // Use canvas API directly for better curve control
  let ctx = shapeGraphics.drawingContext;
  
  // Start a new path for the shape
  ctx.beginPath();
  
  // Create a smooth curve path for the shape
  for (let i = 0; i <= shapePoints.length; i++) {
    let p0 = shapePoints[i % shapePoints.length];
    let p1 = shapePoints[(i + 1) % shapePoints.length];
    
    // If this is the first point, start here
    if (i === 0) {
      ctx.moveTo(p0.x, p0.y);
    }
    
    // Calculate control points for smooth curve
    let prev = shapePoints[(i - 1 + shapePoints.length) % shapePoints.length];
    let next = p1;
    
    // Calculate first control point (leaving current point)
    let cp1x = p0.x + (next.x - prev.x) * 0.2;
    let cp1y = p0.y + (next.y - prev.y) * 0.2;
    
    // Calculate second control point (approaching next point)
    let nextNext = shapePoints[(i + 2) % shapePoints.length];
    let cp2x = next.x - (nextNext.x - p0.x) * 0.2;
    let cp2y = next.y - (nextNext.y - p0.y) * 0.2;
    
    // Draw the curve segment
    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, next.x, next.y);
  }
  
  // Close the path
  ctx.closePath();
  
  // Use the path as a clipping region
  ctx.clip();
  
  // Draw the inverted gradient inside the clipped region
  for (let y = 0; y < height; y++) {
    let inter = map(y, 0, height, 0, 1);
    // Inverted gradient for the shape interior
    let c = shapeGraphics.lerpColor(colorStart, colorEnd, 1-inter);
    ctx.fillStyle = c.toString();
    ctx.fillRect(-width, -height/2 + y, width*2, 1);
  }
  
  shapeGraphics.pop();
}

// Calculate maximum radius allowed at a given angle to stay within window bounds
function getMaxRadiusForAngle(angle) {
  // Inset factor (percentage of screen dimensions to inset from edges)
  let insetFactor = 0.025; // 2.5% inset from each edge
  
  // Calculate the inset window dimensions
  let insetWidth = width * (1 - 2 * insetFactor);
  let insetHeight = height * (1 - 2 * insetFactor);
  
  // Calculate the max distance from center to inset window edge at this angle
  let windowConstraintX, windowConstraintY;
  
  // Calculate distance to window edges
  if (cos(angle) > 0) {
    windowConstraintX = insetWidth/2 / cos(angle); // Distance to right edge
  } else if (cos(angle) < 0) {
    windowConstraintX = -insetWidth/2 / cos(angle); // Distance to left edge
  } else {
    windowConstraintX = Infinity; // Vertical line
  }
  
  if (sin(angle) > 0) {
    windowConstraintY = insetHeight/2 / sin(angle); // Distance to bottom edge
  } else if (sin(angle) < 0) {
    windowConstraintY = -insetHeight/2 / sin(angle); // Distance to top edge
  } else {
    windowConstraintY = Infinity; // Horizontal line
  }
  
  // The minimum distance is our constraint
  // Subtract a small safety margin
  return min(windowConstraintX, windowConstraintY) - 5;
}

// Check if point is inside the shape
function isPointInShape(x, y) {
  // Create a temporary canvas to check if point is inside path
  let tempCanvas = document.createElement('canvas');
  tempCanvas.width = width;
  tempCanvas.height = height;
  let tempCtx = tempCanvas.getContext('2d');
  
  // Draw the shape at the same position
  tempCtx.beginPath();
  for (let i = 0; i <= shapePoints.length; i++) {
    let p0 = shapePoints[i % shapePoints.length];
    let p1 = shapePoints[(i + 1) % shapePoints.length];
    
    // If this is the first point, start here
    if (i === 0) {
      tempCtx.moveTo(p0.x + width/2, p0.y + height/2);
    }
    
    // Calculate control points for smooth curve
    let prev = shapePoints[(i - 1 + shapePoints.length) % shapePoints.length];
    let next = p1;
    
    // Calculate first control point (leaving current point)
    let cp1x = p0.x + (next.x - prev.x) * 0.2 + width/2;
    let cp1y = p0.y + (next.y - prev.y) * 0.2 + height/2;
    
    // Calculate second control point (approaching next point)
    let nextNext = shapePoints[(i + 2) % shapePoints.length];
    let cp2x = next.x - (nextNext.x - p0.x) * 0.2 + width/2;
    let cp2y = next.y - (nextNext.y - p0.y) * 0.2 + height/2;
    
    // Draw the curve segment
    tempCtx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, next.x + width/2, next.y + height/2);
  }
  tempCtx.closePath();
  
  // Check if point is inside
  return tempCtx.isPointInPath(x + width/2, y + height/2);
}

// Add a DOM text element at the given position
function addDOMTextAtPosition(x, y) {
  // Select a random word from the array
  let word = words[wordCounter % words.length];
  wordCounter++;
  
  // Create a container for the word
  let wordDiv = document.createElement('div');
  
  // Assign a unique ID to each word div
  let uniqueId = 'word-' + Date.now();
  wordDiv.id = uniqueId;
  
  // Set styles for the word div - match the same font settings as textBelowGraphics
  wordDiv.style.position = 'absolute';
  wordDiv.style.left = (x) + 'px';
  wordDiv.style.top = (y) + 'px';
  wordDiv.style.transform = 'translate(-50%, -50%)'; // Center at the click point
  wordDiv.style.fontFamily = 'Alata'; // Match exactly with canvas text
  wordDiv.style.fontSize = '18px';
  wordDiv.style.fontWeight = 'normal';
  wordDiv.style.color = "black";
  wordDiv.style.pointerEvents = 'none'; // Make it non-interactive after placing
  wordDiv.style.zIndex = '100'; // Make sure it's on top
  wordDiv.style.userSelect = 'none'; // Prevent text selection
  
  // Set the word text
  wordDiv.textContent = word;
  
  // Add to the container
  document.getElementById('word-container').appendChild(wordDiv);
  
  // Return the created element so it can be used for dragging
  return wordDiv;
}

// Add canvas text at the given position
function addCanvasTextAtPosition(x, y) {
  // Select a random word from the array
  let word = words[wordCounter % words.length];
  wordCounter++;
  
  // Store the text element for below layer
  textBelowElements.push({
    word: word,
    x: x,
    y: y
  });
}

// Mouse interaction - start
function mousePressed() {
  // Calculate position relative to center
  let relX = mouseX - width/2;
  let relY = mouseY - height/2;
  
  // Check if the click is inside or outside the shape
  let isInside = isPointInShape(relX, relY);
  
  // Record whether this drag started on the blob for text placement logic
  startedOnBlob = isInside;
  
  // Calculate angle and distance of click point from center
  let clickAngle = atan2(relY, relX);
  let clickDist = sqrt(relX*relX + relY*relY);
  
  // Normalize click angle to positive range
  if (clickAngle < 0) clickAngle += TWO_PI;
  
  // Direction factor: 1 for outward, -0.3 for inward (reduced impact)
  let directionFactor = isInside ? -0.3 : 1.0;
  
  // Update target radius of all points
  for (let j = 0; j < targetPoints.length; j++) {
    let point = targetPoints[j];
    
    // Calculate angular distance (considering the circular nature)
    let angleDiff = abs(point.angle - clickAngle);
    if (angleDiff > PI) angleDiff = TWO_PI - angleDiff;
    
    // Calculate influence based on angular distance (closer = more influence)
    let influence = 1 - min(1, angleDiff / (PI/2));
    
    if (isInside) {
      // For inside clicks: apply subtle inward warping
      let inwardEffect = clickDist * influence * directionFactor;
      
      // Add the effect, but maintain minimum size
      let newRadius = point.targetRadius + inwardEffect;
      point.targetRadius = max(newRadius, point.initialRadius * 0.7);
    } else {
      // If the click is further out than the current radius at this angle,
      // expand the blob in that direction
      if (clickDist > point.targetRadius) {
        // Expand more in the direction of the click, less in other directions
        let expansion = clickDist * influence;
        
        // Calculate max allowed radius to stay within window bounds
        let maxRadius = getMaxRadiusForAngle(point.angle);
        
        // Update target radius if the expansion would make it larger,
        // but don't exceed window boundaries
        if (point.targetRadius < expansion) {
          point.targetRadius = min(max(point.targetRadius, expansion), maxRadius);
        }
      }
    }
  }
  
  // Start dragging - create new element that will be dragged
  isDragging = true;
  
  // Add a new text element at the click position
  if (isInside) {
    // For clicks on the blob, add DOM text on top
    draggedElement = addDOMTextAtPosition(mouseX, mouseY);
  } else {
    // For clicks outside the blob, add canvas text below
    addCanvasTextAtPosition(mouseX, mouseY);
    let lastIndex = textBelowElements.length - 1;
    if (lastIndex >= 0) {
      // Store reference to the latest text element that will be dragged
      draggedElement = {
        index: lastIndex,
        origX: mouseX,
        origY: mouseY
      };
    }
  }
}

// Handle mouse drag
function mouseDragged() {
  if (!isDragging) return;
  
  // If we're dragging a DOM element (on top of blob)
  if (startedOnBlob && draggedElement) {
    // Update the DOM element's position to follow the mouse
    draggedElement.style.left = mouseX + 'px';
    draggedElement.style.top = mouseY + 'px';
  }
  // If we're dragging a canvas element (below blob)
  else if (draggedElement && draggedElement.index !== undefined) {
    // Update position of dragged canvas element
    textBelowElements[draggedElement.index].x = mouseX;
    textBelowElements[draggedElement.index].y = mouseY;
  }
  
  // Prevent default to stop browser drag behavior
  return false;
}

// Handle mouse release
function mouseReleased() {
  // End all dragging
  isDragging = false;
  isDraggingDOM = false;
  draggedElement = null;
}

// Make canvas responsive
function windowResized() {
  // Resize the canvas
  resizeCanvas(windowWidth, windowHeight, WEBGL);
  
  // Recreate the graphics buffers with new dimensions
  shapeGraphics = createGraphics(width, height);
  backgroundGraphics = createGraphics(width, height);
  textBelowGraphics = createGraphics(width, height);
  
  shapeGraphics.colorMode(HSB, 360, 100, 100);
  backgroundGraphics.colorMode(HSB, 360, 100, 100);
  textBelowGraphics.colorMode(HSB, 360, 100, 100);
  
  // Colors should be recreated after resizing
  colorStart = shapeGraphics.color(20, 40, 100);  // Warm color (top)
  colorEnd = shapeGraphics.color(300, 10, 100);   // Light pink (bottom)
}