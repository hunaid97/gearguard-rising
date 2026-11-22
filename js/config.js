// =====================================================
//  PERSONALISE THE GAME HERE
// =====================================================
const PERSONAL = {
  name: 'QUMAYL',          // shown on screen
  spokenName: 'Kumail',    // how the read-aloud voice should say his name (spell it phonetically)
  age: 7,

  // Colours for Qumayl's pixel self (taken from his school photo)
  kid: {
    skin: '#b98260', hair: '#1c1716', shirt: '#f4f5f7', tie: '#8d939d', tieStripe: '#c45a66',
    pants: '#1f2026', shoes: '#141519',
  },

  // His photo + the square to crop his face from (in photo pixels)
  // (the photo is only used when playing from this Mac - it is never uploaded to the online version)
  photo: /github\.io$/.test(location.hostname) ? null : 'assets/qumayl.webp',
  photoCrop: { x: 298, y: 478, size: 262 },

  // His robot battle-suit colours, and what it transforms into: 'car' | 'truck' | 'jet' | 'tank'
  suit: { c1: '#2f6fff', c2: '#e8ecf2', c3: '#ffcc22', vehicle: 'car' },

  // Lines shown on the final birthday screen
  birthdayLines: [
    'You are brave, kind and strong.',
    'A TRUE ROBOT HERO!',
    'Made with love, just for you.',
  ],
};
