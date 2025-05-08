export enum UserRole {
  Member = 'Member',
  Sponsor = 'Sponsor',
  Creator = 'Creator',
  Club_Founder = 'Club_Founder'
}

export interface User {
  id: string;
  fullName: string;
  email: string;
  roles: UserRole[];
  phoneNumber?: string;
  bio?: string;
  interests?: string[];
  profileImage?: string;
} 