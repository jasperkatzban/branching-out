let count = 1;
let subnets = new Set()

let lastSnappedNode = {}

function generateKey(){
  count += 1;
  return count.toString();
}

let nodes = {
  "0": {
    key: "0",
    type: "router",
    publicIP: "10.0.0.1",
    localIP: "10.0.0.0",
    childNodes: {},
    x: 268,
    y: 158
  },
};

const ROOT = nodes["0"]

async function setup() {
  // Load the image.
  img = await loadImage('background.jpg');

  createCanvas(800, 1000)
  frameRate(30);

  flex({
    container: {
      padding: "1em"
    }
  });

  pixelDensity(2);
  background("#f8f0e6")

  noCursor()
}

function draw() {
  background("#f8f0e6")
  image(img, 0, 0, width, height, 0, 0, img.width, img.height, COVER);

  let {node, distance} = getNearestNode(mouseX, mouseY, ROOT)
  if (keyIsDown(SHIFT)) {
    stroke("#8b8481");
    strokeWeight(2);
    line(node.x, node.y, mouseX, mouseY);
  } 

  drawEdges();
  drawNodes();

  drawCursor();
}

function drawCursor() {
  strokeWeight(4)
  stroke("#ededed")
  line(mouseX-10, mouseY, mouseX-3, mouseY)
  line(mouseX+10, mouseY, mouseX+3, mouseY)
  line(mouseX, mouseY+10, mouseX, mouseY+3)
  line(mouseX, mouseY-10, mouseX, mouseY-3)
  
  strokeWeight(1)
  stroke("#000")
  line(mouseX-10, mouseY, mouseX-3, mouseY)
  line(mouseX+10, mouseY, mouseX+3, mouseY)
  line(mouseX, mouseY+10, mouseX, mouseY+3)
  line(mouseX, mouseY-10, mouseX, mouseY-3)
}

function drawNodes() {
  for (let key in nodes) {
    let node = nodes[key];
    drawNode(node);
  }
}

function drawEdges() {
  for (let key in nodes) {
    let node = nodes[key];
    drawEdge(node);
  }
}

function drawEdge(node) {
  if (node.childNodes) {
    for (let childIP in node.childNodes) {
      let childNode = node.childNodes[childIP];
      drawEdge(childNode);
      stroke("#d3c6c1");
      strokeWeight(2);
      line(node.x, node.y, childNode.x, childNode.y);
    }
  }
}

function drawNode(node) {
  let hover = dist(node.x, node.y, mouseX, mouseY) < 30
  fill(hover ? "#282828" : "#b49d94");
  stroke( "#ededed");
  strokeWeight(2);
  ellipse(node.x, node.y, 6, 6);

  strokeWeight(4);
  stroke("#ededed")
  fill(hover ? "#282828" : "#274100");
  textAlign(CENTER, CENTER);
  textSize(12);
  text(node.publicIP, node.x, node.y - 12);
  fill(hover ? "#282828" : "#681000");
  text(node.localIP, node.x, node.y + 13.5);

  if (node.childNodes) {
    for (let childIP in node.childNodes) {
      let childNode = node.childNodes[childIP];
      drawNode(childNode);
    }
  }
}

function createNode(type, publicIP, localIP, x, y) {
  (key = generateKey()) => {
    nodes[key] = {
      key:key,
      type: type,
      publicIP: publicIP,
      localIP: localIP,
      childNodes: {},
      x: x,
      y: y
    };
  }
}

function getNearestNode(x, y, root) {
  if (keyIsDown(SHIFT)) {
    return {node: lastSnappedNode, distance: 0};
  }

  let nearestNode = root;
  let minDistance = computeDistance(root, x, y);
  
  if (root.childNodes) {
    for (let key in root.childNodes) {
      let childNode = root.childNodes[key];
      let childDistance = computeDistance(childNode, x, y);
      if (childDistance < minDistance) {
        minDistance = childDistance;
        nearestNode = childNode;
      }
      let {node, distance} = getNearestNode(x, y, childNode)
      if (distance < minDistance) {
        minDistance = distance;
        nearestNode = node;
      }
    }
  }
  lastSnappedNode = nearestNode
  return {node: nearestNode, distance: minDistance};
}

function computeDistance(node, x, y) {
  return dist(x, y, node.x, node.y);
}

/** Create node at mouse position as child of nearest parent */
function addNodeAtPosition(type,x, y) {
  let {node, distance} = getNearestNode(x, y, ROOT);
  createChildNode(node, type, x, y)
}

/** Create node as child of nearest parent at specified position */
function createChildNode(parent, type, x, y) {
  let key = generateKey()
  let parentNode = dfs(ROOT, parent.key);
  let publicIP = generatePublicIP(parent)
  let localIP = generateLocalIP(parent)

  parentNode.childNodes[key] = {
    key: key,
    type: type,
    publicIP: publicIP,
    localIP: localIP,
    x: x,
    y: y,
    childNodes: {}
  };
}

function mousePressed() {
  addNodeAtPosition("host", int(mouseX), int(mouseY));
  console.log(nodes)
}

/** Get node from key */
function dfs(root, targetKey) {
  if (root.key === targetKey) {
    return root
  } else if (root.childNodes) {
    for (let key in root.childNodes) {
      let childNode = root.childNodes[key]
      if (childNode.key === targetKey) {
        return childNode
      } else {
        let result = dfs(childNode, targetKey)
        if (result) {
          return result
        }
      }
    }
  } else {
    console.error(`node ${targetKey} not available from ${root}`)
  }
}

function generatePublicIP(node) {
  let subnets = getSubnets(ROOT);
  let subnetRange = []

  for (const subnet of subnets) {
    let subnetOctets = subnet.split(".")
    let subnetOctet = int(subnetOctets.pop())
    subnetRange.push(subnetOctet)
  }

  let targetSubnet
    // it doesn't actually work like this, they're not assigned in ascending order
  targetSubnet = Math.max(...subnetRange) + 1

  let localOctets = node.publicIP.split(".")
  let publicOctets = [localOctets[0], localOctets[1], targetSubnet, 1]
  let publicIP = publicOctets.join(".")

  return publicIP
}
  
function generateLocalIP(node) {
  let octets = node.publicIP.split(".")
  let parentHostID = int(octets.pop())
  let networkID = octets.join(".")

  let hostIDsOnNetwork = getHostIDsOnSubnet(node)

  if (hostIDsOnNetwork) {
    // it doesn't actually work like this, they're not assigned in ascending order
    hostID = Math.max(...hostIDsOnNetwork) + 1
  } else {
    hostID = 1;
  }

  let publicIP = [networkID,hostID].join(".")
  
  return publicIP;
}

function getHostIDsOnSubnet(node) {
  let octets = node.publicIP.split(".")
  let parentHostID = int(octets.pop())

  let hostIDs = [parentHostID]

  for (let key in node.childNodes) {
    let localIP = node.childNodes[key].localIP 
    let childOctets = localIP.split(".")
    let childHostID = int(childOctets.pop())
    hostIDs.push(childHostID)
  }
  return hostIDs
}

/** Check subnets */
function getSubnets(root) {
  let rootPublicSubnet = getSubnet(root.publicIP)
  subnets.add(rootPublicSubnet)
  let rootLocalSubnet = getSubnet(root.localIP)
  subnets.add(rootLocalSubnet)
  
  if (root.childNodes) {
    for (let key in root.childNodes) {
      let childNode = root.childNodes[key];

      let childSubnetPublic = getSubnet(childNode.publicIP)
      subnets.add(childSubnetPublic)
      
      let childSubnetLocal = getSubnet(childNode.localIP)
      subnets.add(childSubnetLocal)
      

      let childSubnets = getSubnets(childNode)
      subnets.union(childSubnets);
    }
  }
  return subnets;
}

function getSubnet(ip) {
  let octets = ip.split(".")
  octets.pop()
  subnet = octets.join(".")
  return subnet
}