import React, { useState, useEffect } from 'react';
import './Typewriter.css';

const WORDS = ['ClassBack'];
const TYPE_SPEED = 110;
const DELETE_SPEED = 70;
const PAUSE_MS = 2000;

export default function Typewriter() {
  const [displayed, setDisplayed] = useState('');
  const [wordIndex, setWordIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const current = WORDS[wordIndex % WORDS.length];

    const tick = () => {
      if (!isDeleting) {
        setDisplayed(current.substring(0, displayed.length + 1));
        if (displayed.length + 1 === current.length) {
          setTimeout(() => setIsDeleting(true), PAUSE_MS);
          return;
        }
      } else {
        setDisplayed(current.substring(0, displayed.length - 1));
        if (displayed.length - 1 === 0) {
          setIsDeleting(false);
          setWordIndex((i) => (i + 1) % WORDS.length);
        }
      }
    };

    const speed = isDeleting ? DELETE_SPEED : TYPE_SPEED;
    const timer = setTimeout(tick, speed);
    return () => clearTimeout(timer);
  }, [displayed, isDeleting, wordIndex]);

  return (
    <h1 className="typewriter-brand">
      <span className="typewriter-text">{displayed}</span>
      <span className="typewriter-cursor" aria-hidden="true">|</span>
    </h1>
  );
}
