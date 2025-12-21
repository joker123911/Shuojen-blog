import React from 'react';
import ChessGame from './ChessGame';

export default function White({ pgn }) {
  return <ChessGame pgn={pgn} orientation="w" />;
}