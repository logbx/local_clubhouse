export enum UserRole {
  Member = 'Member',
  Sponsor = 'Sponsor',
  Creator = 'Creator',
  Club_Founder = 'Club_Founder'
}

export interface User {
  id: string;
  username: string;
  email: string;
  roles: UserRole[];
  phoneNumber?: string;
  bio?: string;
  interests?: string[];
  profileImage?: string;
} 