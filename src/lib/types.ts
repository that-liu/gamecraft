export interface GameMechanic { id: string; name: string; description: string; type: string; rules: string; }
export interface GameLevel { id: string; name: string; order: number; environment: string; objectives: string; enemies: string; items: string; notes: string; }
export interface GameCharacter { id: string; name: string; role: string; type: 'hero'|'npc'|'enemy'|'boss'; personality: string; backstory: string; abilities: string; appearance: string; }
export interface GameQuest { id: string; name: string; order: number; type: 'main'|'side'; giver: string; objectives: string; rewards: string; dialogue: string; prerequisites: string; }
export interface DialogNode { id: string; speaker: string; text: string; choices: { text: string; nextId: string }[]; }
export interface GameProject {
  id: string; title: string; genre: string; platform: string; description: string;
  targetAudience: string; coreLoop: string; usp: string;
  mechanics: GameMechanic[]; levels: GameLevel[];
  characters: GameCharacter[]; quests: GameQuest[];
  dialogs: DialogNode[]; notes: string;
  createdAt: string; updatedAt: string;
}
