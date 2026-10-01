import { Chess } from 'chess.js';

const NAG_MAP = {
  '$1': '!',
  '$2': '?',
  '$3': '!!',
  '$4': '??',
  '$5': '!?',
  '$6': '?!',
  '$10': '=',
  '$14': '⩲',
  '$15': '⩱',
  '$16': '±',
  '$17': '∓',
  '$18': '+-',
  '$19': '-+',
};

const COLOR_MAP = {
  G: 'green',
  R: 'red',
  B: 'blue',
  Y: 'yellow',
};

/**
 * Parses [%cal ...] (arrows) and [%csl ...] (colored squares) from PGN comments
 */
export function parseCommentTags(rawComment) {
  let comment = rawComment || '';
  const shapes = [];

  // Match [%cal Ge2e4,Rf1b5]
  const calRegex = /\[%cal\s+([^\]]+)\]/g;
  let match;
  while ((match = calRegex.exec(rawComment)) !== null) {
    const list = match[1].split(',');
    list.forEach(item => {
      const trimmed = item.trim();
      if (trimmed.length >= 5) {
        const colorCode = trimmed[0].toUpperCase();
        const orig = trimmed.slice(1, 3).toLowerCase();
        const dest = trimmed.slice(3, 5).toLowerCase();
        const brush = COLOR_MAP[colorCode] || 'green';
        shapes.push({ orig, dest, brush });
      }
    });
  }

  // Match [%csl Gc4,Re5]
  const cslRegex = /\[%csl\s+([^\]]+)\]/g;
  while ((match = cslRegex.exec(rawComment)) !== null) {
    const list = match[1].split(',');
    list.forEach(item => {
      const trimmed = item.trim();
      if (trimmed.length >= 3) {
        const colorCode = trimmed[0].toUpperCase();
        const orig = trimmed.slice(1, 3).toLowerCase();
        const brush = COLOR_MAP[colorCode] || 'green';
        shapes.push({ orig, brush });
      }
    });
  }

  // Remove [%...] tags from human commentary
  comment = comment.replace(/\[%[^\]]+\]/g, '').trim();

  return { comment, shapes };
}

export const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

/**
 * Parses a PGN string into a full N-ary Move Tree
 */
export function parsePgnToStudyTree(pgn) {
  const root = {
    id: 'root',
    san: 'START',
    ply: 0,
    fen: START_FEN,
    parentId: null,
    children: [],
    comment: '',
    shapes: [],
    nag: '',
  };

  const nodesMap = { root };

  if (!pgn || typeof pgn !== 'string') {
    return { root, nodesMap };
  }

  // Strip PGN header tags [Key "Value"] except [%cal...] tags which appear inside comments
  const cleanPgn = pgn.replace(/\[(?!%)[^\]]*\]/g, '').replace(/\s+/g, ' ').trim();

  // Tokenize: {comment}, (open paren), )close paren, or move tokens
  const tokenRegex = /(\{[^}]*\})|(\()|(\))|([^\s()]+)/g;
  let match;
  const tokens = [];

  while ((match = tokenRegex.exec(cleanPgn)) !== null) {
    if (match[1]) {
      tokens.push({ type: 'comment', value: match[1].slice(1, -1).trim() });
    } else if (match[2]) {
      tokens.push({ type: 'open' });
    } else if (match[3]) {
      tokens.push({ type: 'close' });
    } else if (match[4]) {
      let val = match[4].trim();

      // Skip game termination markers
      if (['1-0', '0-1', '1/2-1/2', '*'].includes(val)) continue;

      // Filter move numbers like "1." or "3..."
      if (/^\d+\.+$/.test(val)) continue;

      // Remove prefix move numbers if attached, e.g. "1.e4" -> "e4"
      val = val.replace(/^\d+\.+/, '');
      if (!val) continue;

      // Check for trailing NAG attached to move, e.g. "c5!", "Nf3!?", "Qd4??"
      let nag = '';
      const nagMatch = val.match(/([?!]+)$/);
      if (nagMatch) {
        nag = nagMatch[1];
        val = val.replace(/([?!]+)$/, '');
      }

      // Check for standalone NAG tokens, e.g. "$1", "$2"
      if (val.startsWith('$')) {
        tokens.push({ type: 'nag', value: NAG_MAP[val] || val });
        continue;
      }

      tokens.push({ type: 'move', value: val, nag });
    }
  }

  let currentNode = root;
  const stack = [];
  let isNextMoveVariation = false;
  let variationParent = null;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    if (token.type === 'open') {
      const parentNode = currentNode.parentId ? nodesMap[currentNode.parentId] : root;
      stack.push({
        resumeNode: currentNode,
        branchParent: parentNode,
      });
      isNextMoveVariation = true;
      variationParent = parentNode;
    } else if (token.type === 'close') {
      if (stack.length > 0) {
        const frame = stack.pop();
        currentNode = frame.resumeNode;
      }
      isNextMoveVariation = false;
      variationParent = null;
    } else if (token.type === 'move') {
      const parentNode = isNextMoveVariation && variationParent ? variationParent : currentNode;
      isNextMoveVariation = false;
      variationParent = null;

      const newId = 'n_' + Math.random().toString(36).slice(2, 9);
      const newNode = {
        id: newId,
        san: token.value,
        ply: parentNode.ply + 1,
        parentId: parentNode.id,
        children: [],
        comment: '',
        shapes: [],
        nag: token.nag || '',
      };

      parentNode.children.push(newNode);
      nodesMap[newId] = newNode;
      currentNode = newNode;
    } else if (token.type === 'comment') {
      if (currentNode) {
        const { comment, shapes } = parseCommentTags(token.value);
        currentNode.comment = comment;
        if (shapes.length > 0) {
          currentNode.shapes = [...(currentNode.shapes || []), ...shapes];
        }
      }
    } else if (token.type === 'nag') {
      if (currentNode && !currentNode.nag) {
        currentNode.nag = token.value;
      }
    }
  }

  // Calculate FEN, from, to for every node using chess.js
  function calculateFens(node, currentFen) {
    node.children.forEach(child => {
      const chess = new Chess(currentFen);
      try {
        const moveRes = chess.move(child.san);
        if (moveRes) {
          child.fen = chess.fen();
          child.from = moveRes.from;
          child.to = moveRes.to;
          child.san = moveRes.san; // normalized SAN
        } else {
          child.fen = currentFen;
        }
      } catch (err) {
        console.warn(`Invalid move ${child.san} from FEN ${currentFen}:`, err.message);
        child.fen = currentFen;
      }
      calculateFens(child, child.fen);
    });
  }

  calculateFens(root, root.fen);

  return { root, nodesMap };
}
