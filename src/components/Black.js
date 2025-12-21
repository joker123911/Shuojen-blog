import React from 'react';
import ChessGame from './ChessGame';

export default function Black({ pgn }) {
  return <ChessGame pgn={pgn} orientation="b" />;
}