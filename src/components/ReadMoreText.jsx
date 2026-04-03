import React, { useState } from 'react';

export default function ReadMoreText({ text, maxLength = 150 }) {
  const [expanded, setExpanded] = useState(false);
  
  if (!text) return null;
  if (text.length <= maxLength) return <span>{text}</span>;

  return (
    <span>
      {expanded ? text : `${text.substring(0, maxLength)}...`}
      <button 
        className="read-more-btn" 
        onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
      >
        {expanded ? ' ver menos' : ' ver más'}
      </button>
    </span>
  );
}
