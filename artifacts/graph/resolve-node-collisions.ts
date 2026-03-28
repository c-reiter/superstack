export type CollisionAlgorithmOptions = {
  maxIterations?: number;
  overlapThreshold?: number;
  margin?: number;
  minX?: number;
  maxX?: number;
  minY?: number;
};

export type CollisionNode = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type Box<T extends CollisionNode> = {
  x: number;
  y: number;
  width: number;
  height: number;
  moved: boolean;
  node: T;
};

function clamp(value: number, min?: number, max?: number) {
  let nextValue = value;

  if (typeof min === "number") {
    nextValue = Math.max(nextValue, min);
  }

  if (typeof max === "number") {
    nextValue = Math.min(nextValue, max);
  }

  return nextValue;
}

function getBoxesFromNodes<T extends CollisionNode>(nodes: T[], margin = 0) {
  const boxes: Box<T>[] = new Array(nodes.length);

  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index];
    boxes[index] = {
      x: node.x - margin,
      y: node.y - margin,
      width: node.width + margin * 2,
      height: node.height + margin * 2,
      node,
      moved: false,
    };
  }

  return boxes;
}

export function resolveNodeCollisions<T extends CollisionNode>(
  nodes: T[],
  {
    maxIterations = 80,
    overlapThreshold = 0.5,
    margin = 0,
    minX,
    maxX,
    minY,
  }: CollisionAlgorithmOptions = {}
) {
  const boxes = getBoxesFromNodes(nodes, margin);

  for (let iteration = 0; iteration <= maxIterations; iteration += 1) {
    let moved = false;

    for (let index = 0; index < boxes.length; index += 1) {
      for (
        let otherIndex = index + 1;
        otherIndex < boxes.length;
        otherIndex += 1
      ) {
        const boxA = boxes[index];
        const boxB = boxes[otherIndex];
        const centerAX = boxA.x + boxA.width * 0.5;
        const centerAY = boxA.y + boxA.height * 0.5;
        const centerBX = boxB.x + boxB.width * 0.5;
        const centerBY = boxB.y + boxB.height * 0.5;
        const dx = centerAX - centerBX;
        const dy = centerAY - centerBY;
        const px = (boxA.width + boxB.width) * 0.5 - Math.abs(dx);
        const py = (boxA.height + boxB.height) * 0.5 - Math.abs(dy);

        if (px <= overlapThreshold || py <= overlapThreshold) {
          continue;
        }

        boxA.moved = true;
        boxB.moved = true;
        moved = true;

        if (px < py) {
          const direction = dx > 0 ? 1 : -1;
          const amount = (px / 2) * direction;

          boxA.x = clamp(boxA.x + amount, minX, maxX);
          boxB.x = clamp(boxB.x - amount, minX, maxX);
        } else {
          const direction = dy > 0 ? 1 : -1;
          const amount = (py / 2) * direction;

          boxA.y = clamp(boxA.y + amount, minY);
          boxB.y = clamp(boxB.y - amount, minY);
        }
      }
    }

    if (!moved) {
      break;
    }
  }

  return boxes.map((box) => ({
    ...box.node,
    x: clamp(
      box.x + margin,
      minX !== undefined ? minX + margin : undefined,
      maxX !== undefined ? maxX + margin : undefined
    ),
    y: clamp(box.y + margin, minY !== undefined ? minY + margin : undefined),
  }));
}
