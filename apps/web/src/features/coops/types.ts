export interface CoopMember {
  userId: string;
  name: string;
  role: 'LEADER' | 'MEMBER';
  joinedAt: string;
}

export interface Coop {
  id: string;
  name: string;
  joinCode: string;
  myRole: 'LEADER' | 'MEMBER' | null;
  members: CoopMember[];
}
