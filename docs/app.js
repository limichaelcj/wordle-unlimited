(function(){
  
  const CACHE = {};
  const SETTINGS = {
    maxAttempts: 6,
  }
  const STATE = {
    interactive: false,
    answer: null,
    roundWon: false,
    attempts: [],
  };

  document.addEventListener('DOMContentLoaded', init);

  function init(){
    document.getElementById('new-word').addEventListener('click', clickNewWord);
    document.getElementById('keyboard').addEventListener('click', clickKeyboard);
    window.addEventListener('keyup', handleKeyup);
  }

  /* Getters & Finders */

  function getCurrentAttemptIndex(){
    return STATE.attempts.length;
  }

  function findCurrentAttemptRow(){
    const attemptIndex = getCurrentAttemptIndex();
    return document.querySelectorAll('#game-board .game-row')[attemptIndex];
  }

  function getCurrentAttemptValue(){
    const $row = findCurrentAttemptRow();
    if ($row) {
      return Array.from($row.querySelectorAll('.game-tile[data-state="tbd"]')).map($tile => {
        return $tile.dataset.value;
      }).join('');
    } else {
      return '';
    }
  }

  function findCurrentAttemptTile(){
    const $row = findCurrentAttemptRow();
    if ($row) {
      // find first tile without a value (undefined if not found)
      return Array.from($row.querySelectorAll('.game-tile')).find($tile => !$tile.dataset.value);
    } else {
      return undefined;
    }
  }

  /* Setters */

  function setTile($tile, state, value){
    if (typeof state === 'string') {
      $tile.dataset.state = state;
    }
    if (typeof value === 'string') {
      $tile.dataset.value = value;
    }
  }

  function setKeyState(keyValue, state){
    var $key = document.querySelector(`#keyboard .keyboard-key[data-value="${keyValue}"]`);
    if ($key && !($key.dataset.state === 'correct' && state === 'present')){
      // do not "downgrade" from 'correct' to 'present' (prevents inconsistencies for multiple letters within a word)
      $key.dataset.state = state;
    }
  }

  /* Renderers */

  function resetGameBoard(){
    document.querySelectorAll('#game-board .game-tile').forEach($tile => {
      setTile($tile, '', '');
    });
    document.querySelectorAll('#keyboard .keyboard-key[data-type="letter"]').forEach($key => {
      $key.dataset.state = '';
    })
    updateKeyboardState();
  }

  function updateKeyboardState(){
    if (STATE.roundWon || STATE.attempts.length >= SETTINGS.maxAttempts || !findCurrentAttemptRow()) {
      // round completed, disable all keys
      document.querySelectorAll('#keyboard .keyboard-key').forEach($key => {
        $key.classList.add('disabled');
      });
      return;
    }

    const attempt = getCurrentAttemptValue();
    document.querySelectorAll('#keyboard .keyboard-key').forEach($key => {
      const keyType = ($key.dataset.type || 'letter').toLowerCase();
      let enableKey;
      switch(keyType){
        case 'enter':
          enableKey = attempt.length === 5;
          break;
        case 'backspace':
          enableKey = attempt.length > 0;
          break;
        case 'letter':
        default:
          enableKey = attempt.length < 5;
      }
      if (enableKey){
        $key.classList.remove('disabled');
      } else {
        $key.classList.add('disabled');
      }
    });
  }

  /* Event Handlers */

  function clickNewWord(e){
    const $btn = e.currentTarget;
    const $game = document.querySelector('.game-container');
    $game.classList.add('disabled');
    $btn.innerHTML = $btn.dataset.pendingText;

    return new Promise((resolve, reject) => {
      // cache-first fetch (prevents duplicate words)
      if (typeof CACHE.words !== 'undefined' && CACHE.words.constructor.name === 'Array') {
        resolve(CACHE.words);
      } else {
        fetch('words.json').then(res => res.json()).then(words => {
          CACHE.dictionary = words.slice();
          resolve(words);
        });
      }
    }).then(words => {
      // select random word by index and remove it from the words list
      const randomIndex = Math.floor(Math.random() * words.length);
      const word = words.splice(randomIndex, 1)[0];
      // update the cache 
      CACHE.words = words;
      // update/reset game state
      STATE.answer = word;
      STATE.attempts = [];
      STATE.roundWon = false;
      STATE.interactive = true;

      // Successful fetch: reset game tile UI
      resetGameBoard();
      reveal('.game-board-container.hidden, .keyboard-container.hidden');

    }).finally(() => {
      $game.classList.remove('disabled');
      $btn.innerHTML = $btn.dataset.defaultText;
    });
  }

  function clickKeyboard(e){
    const $key = e.target;
    if (!$key.classList.contains('keyboard-key')){
      return;
    }
    e.stopPropagation();
  
    const type = $key.dataset.type;
    const value = $key.dataset.value;
    if (!type) return;

    switch(type.toUpperCase()){
      case 'ENTER':
        handleSubmitAttempt();
        break;
      case 'BACKSPACE':
        handleBackspace();
        break;
      case 'LETTER':
      default:
        handleInputLetter(value);
    }
  }

  function handleKeyup(e){
    e.preventDefault();
    if (!STATE.interactive) return;

    switch(e.key){
      case 'Enter':
        handleSubmitAttempt();
        break;
      case 'Backspace':
        handleBackspace();
        break;
      default:
        if (e.key.match(/^[a-z]{1}$/i)){
          handleInputLetter(e.key);
        }
    }
  }

  function handleInputLetter(value){
    const $tile = findCurrentAttemptTile();
    if ($tile) {
      setTile($tile, 'tbd', value.toUpperCase());
      updateKeyboardState();
    }
  }

  function handleSubmitAttempt(){
    const $row = findCurrentAttemptRow();
    if (!$row) {
      return;
    }
    const $tbdTiles = $row.querySelectorAll('.game-tile[data-state="tbd"]');
    if ($tbdTiles.length !== 5) {
      return;
    }

    // validate word (must be in dictionary)
    const userAnswer = Array.from($tbdTiles).map($tile => $tile.dataset.value).join('').toLowerCase();
    if (!CACHE.dictionary.includes(userAnswer)){
      return alert('Invalid word');
    }
    
    // analyze attempt
    const correctAnswer = STATE.answer.toUpperCase();
    $tbdTiles.forEach(($tile, i) => {
      const tileValue = $tile.dataset.value.toUpperCase();
      if (tileValue === correctAnswer[i]){
        setTile($tile, 'correct');
        setKeyState(tileValue, 'correct');
      } else if (correctAnswer.includes(tileValue)) {
        setTile($tile, 'present');
        setKeyState(tileValue, 'present');
      } else {
        setTile($tile, 'absent');
        setKeyState(tileValue, 'absent');
      }
    });

    STATE.attempts.push(userAnswer);
    STATE.roundWon = correctAnswer == userAnswer;

    // last attempt was made
    if (STATE.attempts.length >= SETTINGS.maxAttempts){
      setTimeout(() => alert(`Answer is: ${correctAnswer}`), 100);
    }

    updateKeyboardState();
  }

  function handleBackspace(){
    const $row = findCurrentAttemptRow();
    if ($row) {
      const $tbdTiles = $row.querySelectorAll('.game-tile[data-state="tbd"]');
      const $lastTile = $tbdTiles[$tbdTiles.length-1];
      if ($lastTile){
        setTile($lastTile, '', '');
        updateKeyboardState();
      }
    }
  }

  /* Helpers */

  function reveal(selector){
    const elements = document.querySelectorAll(selector);
    elements.forEach(elem => {
      elem.classList.remove('hidden');
      elem.style.opacity = 0;
      elem.style.transition = '500ms ease-out';
    });
    requestAnimationFrame(() => {
      elements.forEach(elem => {
        elem.style.opacity = 1;
      });
    });
  }

})();