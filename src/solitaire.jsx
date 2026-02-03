import React, { useState, useEffect, useCallback } from 'react';

const SUITS = ['♠', '♥', '♦', '♣'];
const SUIT_COLORS = { '♠': '#1a1a2e', '♣': '#1a1a2e', '♥': '#c41e3a', '♦': '#c41e3a' };
const VALUES = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

const createDeck = () => {
  const deck = [];
  for (const suit of SUITS) {
    for (let i = 0; i < VALUES.length; i++) {
      deck.push({ suit, value: VALUES[i], rank: i, id: `${VALUES[i]}${suit}` });
    }
  }
  return deck;
};

const shuffleDeck = (deck) => {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

const isRed = (suit) => suit === '♥' || suit === '♦';
const isBlack = (suit) => suit === '♠' || suit === '♣';

const canStackOnTableau = (card, targetCard) => {
  if (!targetCard) return card.value === 'K';
  const differentColor = (isRed(card.suit) && isBlack(targetCard.suit)) || 
                         (isBlack(card.suit) && isRed(targetCard.suit));
  return differentColor && card.rank === targetCard.rank - 1;
};

const canStackOnFoundation = (card, foundationCards, suit) => {
  if (foundationCards.length === 0) {
    return card.value === 'A' && card.suit === suit;
  }
  const topCard = foundationCards[foundationCards.length - 1];
  return card.suit === suit && card.rank === topCard.rank + 1;
};

const Card = ({ card, faceUp = true, onClick, onDragStart, onDragEnd, isDragging, stackIndex = 0, isTopOfStack = true }) => {
  const handleDragStart = (e) => {
    if (!faceUp) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', '');
    onDragStart && onDragStart(e);
  };

  return (
    <div
      draggable={faceUp}
      onDragStart={handleDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={`card ${faceUp ? 'face-up' : 'face-down'} ${isDragging ? 'dragging' : ''}`}
      style={{
        '--stack-index': stackIndex,
        '--suit-color': faceUp ? SUIT_COLORS[card.suit] : '#2d4a3e',
      }}
    >
      {faceUp ? (
        <>
          <div className="card-corner top-left">
            <span className="card-value">{card.value}</span>
            <span className="card-suit">{card.suit}</span>
          </div>
          <div className="card-center">{card.suit}</div>
          <div className="card-corner bottom-right">
            <span className="card-value">{card.value}</span>
            <span className="card-suit">{card.suit}</span>
          </div>
        </>
      ) : (
        <div className="card-back">
          <div className="card-back-pattern"></div>
        </div>
      )}
    </div>
  );
};

const CardStack = ({ cards, faceUpCount, onCardClick, onDragStart, onDrop, onDoubleClick, pileIndex, draggingCard }) => {
  const [dragOver, setDragOver] = useState(false);

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);
  
  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    onDrop && onDrop(pileIndex);
  };

  const faceDownCount = cards.length - faceUpCount;

  return (
    <div 
      className={`card-stack ${dragOver ? 'drag-over' : ''} ${cards.length === 0 ? 'empty' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {cards.length === 0 && <div className="empty-slot tableau-slot">K</div>}
      {cards.map((card, index) => {
        const isFaceUp = index >= faceDownCount;
        const faceUpIndex = isFaceUp ? index - faceDownCount : 0;
        return (
          <div 
            key={card.id} 
            className="stacked-card"
            style={{ 
              '--stack-offset': isFaceUp ? `${faceDownCount * 6 + faceUpIndex * 32}px` : `${index * 6}px`
            }}
            onDoubleClick={() => isFaceUp && index === cards.length - 1 && onDoubleClick && onDoubleClick(index)}
          >
            <Card
              card={card}
              faceUp={isFaceUp}
              onClick={() => isFaceUp && onCardClick && onCardClick(card, index)}
              onDragStart={(e) => isFaceUp && onDragStart && onDragStart(card, index, pileIndex)}
              stackIndex={index}
              isTopOfStack={index === cards.length - 1}
            />
          </div>
        );
      })}
    </div>
  );
};

const Foundation = ({ cards, suit, onDrop, onDragStart, index, draggingCard }) => {
  const [dragOver, setDragOver] = useState(false);

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    onDrop && onDrop(index);
  };

  const topCard = cards[cards.length - 1];

  return (
    <div 
      className={`foundation ${dragOver ? 'drag-over' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      {cards.length === 0 ? (
        <div className="empty-slot foundation-slot" style={{ '--suit-color': SUIT_COLORS[suit] }}>
          {suit}
        </div>
      ) : (
        <Card 
          card={topCard} 
          faceUp={true} 
          onDragStart={() => onDragStart && onDragStart(topCard, index)}
        />
      )}
    </div>
  );
};

const Solitaire = () => {
  const [drawCount, setDrawCount] = useState(1);
  const [stock, setStock] = useState([]);
  const [waste, setWaste] = useState([]);
  const [wasteVisible, setWasteVisible] = useState(0);
  const [foundations, setFoundations] = useState([[], [], [], []]);
  const [tableau, setTableau] = useState([[], [], [], [], [], [], []]);
  const [tableauFaceUp, setTableauFaceUp] = useState([1, 1, 1, 1, 1, 1, 1]);
  const [draggingCard, setDraggingCard] = useState(null);
  const [draggingSource, setDraggingSource] = useState(null);
  const [moves, setMoves] = useState(0);
  const [gameWon, setGameWon] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const initGame = useCallback(() => {
    const deck = shuffleDeck(createDeck());
    const newTableau = [[], [], [], [], [], [], []];
    const newFaceUp = [1, 1, 1, 1, 1, 1, 1];
    let cardIndex = 0;

    for (let i = 0; i < 7; i++) {
      for (let j = i; j < 7; j++) {
        newTableau[j].push(deck[cardIndex++]);
      }
      newFaceUp[i] = 1;
    }

    setTableau(newTableau);
    setTableauFaceUp(newFaceUp);
    setStock(deck.slice(28));
    setWaste([]);
    setWasteVisible(0);
    setFoundations([[], [], [], []]);
    setMoves(0);
    setGameWon(false);
  }, []);

  useEffect(() => {
    initGame();
  }, [initGame]);

  useEffect(() => {
    const allComplete = foundations.every(f => f.length === 13);
    if (allComplete && foundations[0].length > 0) {
      setGameWon(true);
    }
  }, [foundations]);

  // Auto-complete: when stock and waste are empty and all tableau cards are face up
  useEffect(() => {
    if (gameWon) return;
    
    // Check if stock and waste are empty
    if (stock.length > 0 || waste.length > 0) return;
    
    // Check if all tableau cards are face up
    const allFaceUp = tableau.every((pile, i) => {
      return pile.length === 0 || tableauFaceUp[i] === pile.length;
    });
    
    if (!allFaceUp) return;
    
    // Check if there are any cards left in tableau
    const totalTableauCards = tableau.reduce((sum, pile) => sum + pile.length, 0);
    if (totalTableauCards === 0) return;
    
    // Find a card that can be moved to foundation
    const autoMoveOne = () => {
      for (let pileIndex = 0; pileIndex < 7; pileIndex++) {
        const pile = tableau[pileIndex];
        if (pile.length === 0) continue;
        
        const topCard = pile[pile.length - 1];
        
        for (let foundationIndex = 0; foundationIndex < 4; foundationIndex++) {
          if (canStackOnFoundation(topCard, foundations[foundationIndex], SUITS[foundationIndex])) {
            // Move the card
            const newFoundations = [...foundations];
            newFoundations[foundationIndex] = [...newFoundations[foundationIndex], topCard];
            
            const newTableau = [...tableau];
            newTableau[pileIndex] = pile.slice(0, -1);
            
            const newFaceUp = [...tableauFaceUp];
            if (newTableau[pileIndex].length === 0) {
              newFaceUp[pileIndex] = 0;
            } else {
              newFaceUp[pileIndex] = Math.max(1, newFaceUp[pileIndex] - 1);
            }
            
            setFoundations(newFoundations);
            setTableau(newTableau);
            setTableauFaceUp(newFaceUp);
            setMoves(m => m + 1);
            return true;
          }
        }
      }
      return false;
    };
    
    // Use a timeout to create an animation effect
    const timer = setTimeout(() => {
      autoMoveOne();
    }, 100);
    
    return () => clearTimeout(timer);
  }, [stock, waste, tableau, tableauFaceUp, foundations, gameWon]);

  const drawCards = () => {
    if (stock.length === 0) {
      if (waste.length > 0) {
        setStock([...waste].reverse());
        setWaste([]);
        setWasteVisible(0);
      }
    } else {
      const numToDraw = Math.min(drawCount, stock.length);
      const drawn = stock.slice(-numToDraw);
      setStock(stock.slice(0, -numToDraw));
      setWaste([...waste, ...drawn]);
      setWasteVisible(numToDraw);
      setMoves(m => m + 1);
    }
  };

  const handleDragStart = (card, cardIndex, source) => {
    setDraggingCard({ card, cardIndex });
    setDraggingSource(source);
  };

  const handleWasteDragStart = (card) => {
    setDraggingCard({ card, cardIndex: waste.length - 1 });
    setDraggingSource('waste');
  };

  const handleFoundationDragStart = (card, foundationIndex) => {
    setDraggingCard({ card, cardIndex: foundations[foundationIndex].length - 1 });
    setDraggingSource({ type: 'foundation', index: foundationIndex });
  };

  const handleFoundationDrop = (foundationIndex) => {
    if (!draggingCard) return;
    const { card, cardIndex } = draggingCard;
    const suit = SUITS[foundationIndex];

    if (canStackOnFoundation(card, foundations[foundationIndex], suit)) {
      const newFoundations = [...foundations];
      newFoundations[foundationIndex] = [...newFoundations[foundationIndex], card];
      setFoundations(newFoundations);

      if (draggingSource === 'waste') {
        setWaste(waste.slice(0, -1));
        setWasteVisible(v => v - 1);
      } else if (typeof draggingSource === 'number') {
        const newTableau = [...tableau];
        newTableau[draggingSource] = newTableau[draggingSource].slice(0, cardIndex);
        setTableau(newTableau);

        const newFaceUp = [...tableauFaceUp];
        const remainingCards = newTableau[draggingSource].length;
        if (remainingCards === 0) {
          newFaceUp[draggingSource] = 0;
        } else {
          // One face-up card was removed, ensure at least 1 remains face-up
          newFaceUp[draggingSource] = Math.max(1, newFaceUp[draggingSource] - 1);
        }
        setTableauFaceUp(newFaceUp);
      }
      setMoves(m => m + 1);
    }
    setDraggingCard(null);
    setDraggingSource(null);
  };

  const handleTableauDrop = (targetPileIndex) => {
    if (!draggingCard) return;
    const { card, cardIndex } = draggingCard;
    const targetPile = tableau[targetPileIndex];
    const targetCard = targetPile[targetPile.length - 1];

    if (canStackOnTableau(card, targetCard)) {
      const newTableau = [...tableau];
      const newFaceUp = [...tableauFaceUp];
      
      if (draggingSource === 'waste') {
        newTableau[targetPileIndex] = [...newTableau[targetPileIndex], card];
        setWaste(waste.slice(0, -1));
        setWasteVisible(v => v - 1);
        // Add one face-up card to target
        newFaceUp[targetPileIndex] = newFaceUp[targetPileIndex] + 1;
      } else if (typeof draggingSource === 'object' && draggingSource.type === 'foundation') {
        // Moving from foundation to tableau
        const foundationIndex = draggingSource.index;
        const newFoundations = [...foundations];
        newFoundations[foundationIndex] = newFoundations[foundationIndex].slice(0, -1);
        setFoundations(newFoundations);
        
        newTableau[targetPileIndex] = [...newTableau[targetPileIndex], card];
        newFaceUp[targetPileIndex] = newFaceUp[targetPileIndex] + 1;
      } else if (typeof draggingSource === 'number') {
        const sourcePile = tableau[draggingSource];
        const cardsToMove = sourcePile.slice(cardIndex);
        newTableau[draggingSource] = sourcePile.slice(0, cardIndex);
        newTableau[targetPileIndex] = [...newTableau[targetPileIndex], ...cardsToMove];
        
        // Calculate how many face-up cards were moved from source
        /* eslint-disable-next-line no-unused-vars */
        const sourceFaceDownCount = sourcePile.length - tableauFaceUp[draggingSource];
        const movedFaceUpCount = cardsToMove.length; // All moved cards are face-up
        
        // Update source: reduce face-up count by cards moved, but keep at least 1 if cards remain
        const remainingCards = newTableau[draggingSource].length;
        if (remainingCards === 0) {
          newFaceUp[draggingSource] = 0;
        } else {
          // After moving, if there are remaining cards, the top one should be face-up
          // The remaining face-up count is: old face-up count minus moved cards, but at least 1
          const remainingFaceUp = tableauFaceUp[draggingSource] - movedFaceUpCount;
          newFaceUp[draggingSource] = Math.max(1, remainingFaceUp);
        }
        
        // Update target: add the moved face-up cards
        newFaceUp[targetPileIndex] = newFaceUp[targetPileIndex] + movedFaceUpCount;
      }
      
      setTableau(newTableau);
      setTableauFaceUp(newFaceUp);
      setMoves(m => m + 1);
    }
    setDraggingCard(null);
    setDraggingSource(null);
  };

  const flipTableauCard = (pileIndex) => {
    const pile = tableau[pileIndex];
    const faceDownCount = pile.length - tableauFaceUp[pileIndex];
    
    if (faceDownCount > 0) {
      const newFaceUp = [...tableauFaceUp];
      newFaceUp[pileIndex]++;
      setTableauFaceUp(newFaceUp);
    }
  };

  const autoMoveToFoundation = (card, source, cardIndex) => {
    for (let i = 0; i < 4; i++) {
      if (canStackOnFoundation(card, foundations[i], SUITS[i])) {
        const newFoundations = [...foundations];
        newFoundations[i] = [...newFoundations[i], card];
        setFoundations(newFoundations);

        if (source === 'waste') {
          setWaste(waste.slice(0, -1));
          setWasteVisible(v => v - 1);
        } else if (typeof source === 'number') {
          const newTableau = [...tableau];
          newTableau[source] = newTableau[source].slice(0, cardIndex);
          setTableau(newTableau);
          
          const newFaceUp = [...tableauFaceUp];
          const remainingCards = newTableau[source].length;
          if (remainingCards === 0) {
            newFaceUp[source] = 0;
          } else {
            // One face-up card was removed, ensure at least 1 remains face-up
            newFaceUp[source] = Math.max(1, newFaceUp[source] - 1);
          }
          setTableauFaceUp(newFaceUp);
        }
        setMoves(m => m + 1);
        return true;
      }
    }
    return false;
  };

  const handleWasteDoubleClick = () => {
    if (waste.length > 0) {
      autoMoveToFoundation(waste[waste.length - 1], 'waste', waste.length - 1);
    }
  };

  const handleTableauDoubleClick = (pileIndex, cardIndex) => {
    const pile = tableau[pileIndex];
    if (cardIndex === pile.length - 1) {
      autoMoveToFoundation(pile[cardIndex], pileIndex, cardIndex);
    }
  };

  return (
    <div className="solitaire-container">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Crimson+Pro:wght@300;400;500&display=swap');

        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        .solitaire-container {
          min-height: 100vh;
          min-height: 100dvh;
          background: linear-gradient(135deg, #0d1f17 0%, #1a3a2a 50%, #0d1f17 100%);
          background-attachment: fixed;
          padding: 8px;
          font-family: 'Crimson Pro', Georgia, serif;
          position: relative;
          overflow-x: hidden;
        }

        .solitaire-container::before {
          content: '';
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-image: 
            radial-gradient(ellipse at 20% 20%, rgba(212, 175, 55, 0.03) 0%, transparent 50%),
            radial-gradient(ellipse at 80% 80%, rgba(212, 175, 55, 0.03) 0%, transparent 50%);
          pointer-events: none;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
          padding: 0 4px;
          position: relative;
          z-index: 10;
          flex-wrap: wrap;
          gap: 6px;
        }

        .title {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 1.1rem;
          font-weight: 700;
          color: #d4af37;
          text-shadow: 0 2px 20px rgba(212, 175, 55, 0.3);
          letter-spacing: 0.02em;
        }

        .controls {
          display: flex;
          gap: 6px;
          align-items: center;
        }

        .stat {
          font-size: 0.7rem;
          color: #8fbc8f;
          padding: 4px 8px;
          background: rgba(0, 0, 0, 0.3);
          border-radius: 12px;
          border: 1px solid rgba(212, 175, 55, 0.2);
        }

        .btn {
          padding: 5px 10px;
          border: 1px solid rgba(212, 175, 55, 0.4);
          background: rgba(26, 58, 42, 0.8);
          color: #d4af37;
          font-family: 'Crimson Pro', Georgia, serif;
          font-size: 0.7rem;
          cursor: pointer;
          border-radius: 4px;
          transition: all 0.2s ease;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .btn:hover, .btn:active {
          background: rgba(212, 175, 55, 0.2);
          border-color: #d4af37;
        }

        .game-area {
          max-width: 100%;
          margin: 0 auto;
          position: relative;
          z-index: 1;
        }

        .top-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 12px;
          gap: 4px;
        }

        .stock-waste {
          display: flex;
          gap: 4px;
        }

        .stock {
          width: 44px;
          height: 62px;
          cursor: pointer;
          position: relative;
        }

        .stock-pile {
          width: 100%;
          height: 100%;
          position: relative;
        }

        .stock-pile .card {
          position: absolute;
          top: 0;
          left: 0;
        }

        .empty-stock {
          width: 44px;
          height: 62px;
          border: 2px dashed rgba(212, 175, 55, 0.3);
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .empty-stock:hover, .empty-stock:active {
          border-color: rgba(212, 175, 55, 0.6);
          background: rgba(212, 175, 55, 0.1);
        }

        .refresh-icon {
          font-size: 1.2rem;
          color: rgba(212, 175, 55, 0.5);
        }

        .waste-pile {
          width: 90px;
          height: 62px;
          position: relative;
        }

        .waste-card {
          position: absolute;
          top: 0;
          transition: left 0.15s ease;
        }

        .foundations {
          display: flex;
          gap: 4px;
        }

        .foundation {
          width: 44px;
          height: 62px;
          position: relative;
        }

        .foundation.drag-over {
          transform: scale(1.03);
        }

        .foundation .card {
          position: absolute;
          top: 0;
          left: 0;
        }

        .empty-slot {
          width: 44px;
          height: 62px;
          border: 1px solid rgba(212, 175, 55, 0.25);
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.2rem;
          color: var(--suit-color, rgba(212, 175, 55, 0.3));
          opacity: 0.6;
          background: rgba(0, 0, 0, 0.2);
        }

        .tableau-slot {
          color: rgba(212, 175, 55, 0.25);
          font-family: 'Playfair Display', Georgia, serif;
        }

        .tableau {
          display: flex;
          justify-content: space-between;
          gap: 3px;
        }

        .card-stack {
          width: 44px;
          min-height: 62px;
          position: relative;
          flex: 1;
          max-width: 50px;
        }

        .card-stack.drag-over {
          background: rgba(212, 175, 55, 0.1);
          border-radius: 4px;
        }

        .card-stack.empty {
          display: flex;
          align-items: flex-start;
          justify-content: center;
        }

        .stacked-card {
          position: absolute;
          top: var(--stack-offset, 0);
          left: 0;
          transition: top 0.15s ease;
        }

        .card {
          width: 44px;
          height: 62px;
          border-radius: 4px;
          position: relative;
          cursor: pointer;
          transition: transform 0.15s ease, box-shadow 0.15s ease;
          user-select: none;
          -webkit-user-select: none;
          touch-action: none;
        }

        .card.face-up {
          background: linear-gradient(145deg, #fffef5 0%, #f5f0e1 100%);
          box-shadow: 
            0 1px 4px rgba(0, 0, 0, 0.3),
            0 1px 2px rgba(0, 0, 0, 0.2),
            inset 0 1px 0 rgba(255, 255, 255, 0.8);
          border: 1px solid rgba(0, 0, 0, 0.1);
        }

        .card.face-up:hover, .card.face-up:active {
          transform: translateY(-1px);
          box-shadow: 
            0 3px 8px rgba(0, 0, 0, 0.35),
            0 1px 2px rgba(0, 0, 0, 0.2),
            inset 0 1px 0 rgba(255, 255, 255, 0.8);
        }

        .card.face-down {
          background: linear-gradient(145deg, #1e3a5f 0%, #0d1f3a 100%);
          box-shadow: 
            0 1px 4px rgba(0, 0, 0, 0.4),
            inset 0 1px 0 rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.5);
        }

        .card.dragging {
          opacity: 0.8;
          transform: scale(1.05) rotate(2deg);
          z-index: 1000;
        }

        .card-corner {
          position: absolute;
          display: flex;
          flex-direction: column;
          align-items: center;
          line-height: 1;
          color: var(--suit-color);
        }

        .top-left {
          top: 3px;
          left: 3px;
        }

        .bottom-right {
          bottom: 3px;
          right: 3px;
          transform: rotate(180deg);
        }

        .card-value {
          font-family: Arial, Helvetica, sans-serif;
          font-size: 0.75rem;
          font-weight: 700;
        }

        .card-suit {
          font-size: 0.6rem;
        }

        .card-center {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-size: 1.3rem;
          color: var(--suit-color);
          opacity: 0.9;
        }

        .card-back {
          width: 100%;
          height: 100%;
          border-radius: 3px;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .card-back-pattern {
          width: 34px;
          height: 52px;
          border: 1px solid rgba(100, 149, 237, 0.5);
          border-radius: 2px;
          background: 
            repeating-linear-gradient(
              45deg,
              transparent,
              transparent 3px,
              rgba(100, 149, 237, 0.15) 3px,
              rgba(100, 149, 237, 0.15) 6px
            ),
            repeating-linear-gradient(
              -45deg,
              transparent,
              transparent 3px,
              rgba(100, 149, 237, 0.15) 3px,
              rgba(100, 149, 237, 0.15) 6px
            );
        }

        .settings-modal {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100;
          backdrop-filter: blur(4px);
          padding: 16px;
        }

        .settings-content {
          background: linear-gradient(145deg, #1a3a2a 0%, #0d1f17 100%);
          padding: 24px;
          border-radius: 12px;
          border: 1px solid rgba(212, 175, 55, 0.3);
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
          text-align: center;
          width: 100%;
          max-width: 280px;
        }

        .settings-title {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 1.2rem;
          color: #d4af37;
          margin-bottom: 20px;
        }

        .draw-options {
          display: flex;
          gap: 12px;
          justify-content: center;
          margin-bottom: 20px;
        }

        .draw-option {
          padding: 12px 20px;
          border: 2px solid rgba(212, 175, 55, 0.3);
          background: rgba(0, 0, 0, 0.3);
          color: #8fbc8f;
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 1rem;
          cursor: pointer;
          border-radius: 8px;
          transition: all 0.2s ease;
        }

        .draw-option:hover, .draw-option:active {
          border-color: rgba(212, 175, 55, 0.6);
          background: rgba(212, 175, 55, 0.1);
        }

        .draw-option.active {
          border-color: #d4af37;
          background: rgba(212, 175, 55, 0.2);
          color: #d4af37;
        }

        .win-modal {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100;
          backdrop-filter: blur(8px);
          padding: 16px;
        }

        .win-content {
          background: linear-gradient(145deg, #1a3a2a 0%, #0d1f17 100%);
          padding: 32px;
          border-radius: 16px;
          border: 2px solid #d4af37;
          box-shadow: 
            0 0 60px rgba(212, 175, 55, 0.3),
            0 20px 60px rgba(0, 0, 0, 0.5);
          text-align: center;
        }

        .win-title {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 2rem;
          color: #d4af37;
          margin-bottom: 12px;
          text-shadow: 0 2px 20px rgba(212, 175, 55, 0.5);
        }

        .win-stats {
          color: #8fbc8f;
          font-size: 1rem;
          margin-bottom: 24px;
        }

        .win-btn {
          padding: 12px 28px;
          font-size: 1rem;
        }

        @media (min-width: 400px) {
          .solitaire-container {
            padding: 12px;
          }

          .card {
            width: 50px;
            height: 70px;
          }

          .empty-slot, .stock, .foundation {
            width: 50px;
            height: 70px;
          }

          .card-stack {
            width: 50px;
            max-width: 56px;
          }

          .waste-pile {
            width: 80px;
            height: 70px;
          }

          .empty-stock {
            width: 50px;
            height: 70px;
          }

          .card-value {
            font-size: 0.85rem;
          }

          .card-suit {
            font-size: 0.7rem;
          }

          .card-center {
            font-size: 1.5rem;
          }

          .title {
            font-size: 1.3rem;
          }
        }

        @media (min-width: 500px) {
          .solitaire-container {
            padding: 16px;
          }

          .card {
            width: 60px;
            height: 84px;
          }

          .empty-slot, .stock, .foundation {
            width: 60px;
            height: 84px;
          }

          .card-stack {
            width: 60px;
            max-width: 68px;
          }

          .waste-pile {
            width: 100px;
            height: 84px;
          }

          .empty-stock {
            width: 60px;
            height: 84px;
          }

          .card-value {
            font-size: 1rem;
          }

          .card-suit {
            font-size: 0.8rem;
          }

          .card-center {
            font-size: 1.8rem;
          }

          .title {
            font-size: 1.6rem;
          }

          .stat, .btn {
            font-size: 0.8rem;
          }

          .top-left {
            top: 5px;
            left: 5px;
          }

          .bottom-right {
            bottom: 5px;
            right: 5px;
          }
        }

        @media (min-width: 700px) {
          .solitaire-container {
            padding: 20px;
          }

          .card {
            width: 80px;
            height: 112px;
          }

          .empty-slot, .stock, .foundation {
            width: 80px;
            height: 112px;
          }

          .card-stack {
            width: 80px;
            max-width: 90px;
          }

          .waste-pile {
            width: 120px;
            height: 112px;
          }

          .empty-stock {
            width: 80px;
            height: 112px;
          }

          .card-value {
            font-size: 1.1rem;
          }

          .card-suit {
            font-size: 0.9rem;
          }

          .card-center {
            font-size: 2rem;
          }

          .title {
            font-size: 2rem;
          }

          .stat {
            font-size: 0.9rem;
            padding: 8px 16px;
          }

          .btn {
            font-size: 0.9rem;
            padding: 10px 20px;
          }

          .top-left {
            top: 6px;
            left: 6px;
          }

          .bottom-right {
            bottom: 6px;
            right: 6px;
          }

          .card-back-pattern {
            width: 64px;
            height: 96px;
          }
        }
      `}</style>

      <div className="header">
        <h1 className="title">Klondike Solitaire</h1>
        <div className="controls">
          <span className="stat">Moves: {moves}</span>
          <span className="stat">Draw {drawCount}</span>
          <button className="btn" onClick={() => setShowSettings(true)}>Settings</button>
          <button className="btn" onClick={initGame}>New Game</button>
        </div>
      </div>

      <div className="game-area">
        <div className="top-row">
          <div className="stock-waste">
            <div className="stock" onClick={drawCards}>
              {stock.length > 0 ? (
                <div className="stock-pile">
                  {stock.slice(-Math.min(3, stock.length)).map((card, i, arr) => (
                    <div key={card.id} style={{ position: 'absolute', top: 0, left: i * 2 }}>
                      <Card card={card} faceUp={false} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-stock">
                  <span className="refresh-icon">{waste.length > 0 ? '↻' : ''}</span>
                </div>
              )}
            </div>
            <div className="waste-pile">
              {(drawCount === 3 ? waste.slice(waste.length - wasteVisible) : waste.slice(-1)).map((card, i, arr) => (
                <div 
                  key={card.id} 
                  className="waste-card" 
                  style={{ left: drawCount === 3 ? i * 20 : 0, zIndex: i }}
                  onDoubleClick={i === arr.length - 1 ? handleWasteDoubleClick : undefined}
                >
                  <Card 
                    card={card} 
                    faceUp={true}
                    onDragStart={i === arr.length - 1 ? () => handleWasteDragStart(card) : undefined}
                    onClick={i === arr.length - 1 ? () => {} : undefined}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="foundations">
            {SUITS.map((suit, i) => (
              <Foundation
                key={suit}
                cards={foundations[i]}
                suit={suit}
                index={i}
                onDrop={handleFoundationDrop}
                onDragStart={handleFoundationDragStart}
                draggingCard={draggingCard}
              />
            ))}
          </div>
        </div>

        <div className="tableau">
          {tableau.map((pile, i) => (
            <CardStack
              key={i}
              cards={pile}
              faceUpCount={tableauFaceUp[i]}
              pileIndex={i}
              onCardClick={(card, index) => {
                const faceDownCount = pile.length - tableauFaceUp[i];
                if (index === pile.length - 1 && index < faceDownCount) {
                  flipTableauCard(i);
                }
              }}
              onDragStart={(card, cardIndex) => handleDragStart(card, cardIndex, i)}
              onDrop={handleTableauDrop}
              onDoubleClick={(cardIndex) => handleTableauDoubleClick(i, cardIndex)}
              draggingCard={draggingCard}
            />
          ))}
        </div>
      </div>

      {showSettings && (
        <div className="settings-modal" onClick={() => setShowSettings(false)}>
          <div className="settings-content" onClick={e => e.stopPropagation()}>
            <h2 className="settings-title">Draw Count</h2>
            <div className="draw-options">
              <button 
                className={`draw-option ${drawCount === 1 ? 'active' : ''}`}
                onClick={() => setDrawCount(1)}
              >
                Draw 1
              </button>
              <button 
                className={`draw-option ${drawCount === 3 ? 'active' : ''}`}
                onClick={() => setDrawCount(3)}
              >
                Draw 3
              </button>
            </div>
            <button className="btn" onClick={() => { setShowSettings(false); initGame(); }}>
              Start New Game
            </button>
          </div>
        </div>
      )}

      {gameWon && (
        <div className="win-modal">
          <div className="win-content">
            <h2 className="win-title">🎉 You Won!</h2>
            <p className="win-stats">Completed in {moves} moves</p>
            <button className="btn win-btn" onClick={initGame}>Play Again</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Solitaire;
