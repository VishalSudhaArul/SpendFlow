import { Car, GraduationCap, Gift, Heart, House, Laptop, PiggyBank, Plane, Shield, Target } from 'lucide-react';

export const GOAL_ICON_COMPONENTS = {
  'piggy-bank': PiggyBank,
  shield: Shield,
  plane: Plane,
  laptop: Laptop,
  home: House,
  car: Car,
  'graduation-cap': GraduationCap,
  heart: Heart,
  gift: Gift,
  target: Target,
};

export const GOAL_ICON_LABELS = {
  'piggy-bank': 'Savings',
  shield: 'Emergency fund',
  plane: 'Travel',
  laptop: 'Gadget',
  home: 'Home',
  car: 'Vehicle',
  'graduation-cap': 'Education',
  heart: 'Health / family',
  gift: 'Gift / event',
  target: 'Other',
};

export const PACE = {
  on_track: { label: 'On track', tone: 'success' },
  behind: { label: 'Behind pace', tone: 'warning' },
  overdue: { label: 'Past deadline', tone: 'danger' },
  reached: { label: 'Reached', tone: 'success' },
  no_deadline: { label: 'No deadline', tone: 'neutral' },
};
