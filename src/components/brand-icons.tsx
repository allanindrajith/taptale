import React from 'react';
import Svg, { Path, G } from 'react-native-svg';

interface IconProps {
  size?: number;
  color?: string;
}

/**
 * Official Apple Brand Logo
 */
export function AppleLogo({ size = 20, color = '#000000' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 170 170">
      <Path
        fill={color}
        d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.7-3.07-7.63-7.85-11.78-14.35-5.91-9.26-10.36-19.53-13.34-30.82-2.98-11.29-4.47-21.94-4.47-31.95 0-14.15 3.52-25.75 10.57-34.81 7.05-9.06 16.03-13.68 26.94-13.88 4.8.08 10.15 1.34 16.05 3.79 5.9 2.45 9.77 3.73 11.61 3.84 2.22-.22 6.29-1.57 12.2-4.05 5.91-2.48 11.06-3.64 15.46-3.48 11.83.67 21.36 4.96 28.59 12.87-10.45 6.3-15.6 15.01-15.46 26.13.14 8.78 3.53 16.14 10.17 22.08 6.64 5.94 14.51 9.4 23.61 10.38-2.39 7.3-5.32 14.73-8.79 22.28zM119.22 33.15c0-6.72 2.44-12.89 7.33-18.52 4.89-5.63 10.87-9.35 17.94-11.16.22 1.45.33 2.76.33 3.93 0 6.6-2.6 13.01-7.8 19.22-5.2 6.21-11.45 9.87-18.75 10.99-.44-1.34-.66-2.58-.66-3.71z"
      />
    </Svg>
  );
}

/**
 * Official Google 4-Color Brand "G" Logo
 */
export function GoogleLogo({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <G>
        {/* Blue */}
        <Path
          fill="#4285F4"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        {/* Green */}
        <Path
          fill="#34A853"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        {/* Yellow */}
        <Path
          fill="#FBBC05"
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
        />
        {/* Red */}
        <Path
          fill="#EA4335"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
        />
      </G>
    </Svg>
  );
}

/**
 * Clean SVG Email Icon
 */
export function MailIcon({ size = 18, color = '#687076' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 6.5A2.5 2.5 0 0 1 5.5 4h13A2.5 2.5 0 0 1 21 6.5v11a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5v-11z"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M3 7l8.28 5.52a1.3 1.3 0 0 0 1.44 0L21 7"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/**
 * Clean SVG Lock Icon
 */
export function LockIcon({ size = 18, color = '#687076' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5 11a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-8z"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M8 9V6.5a4 4 0 0 1 8 0V9"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M12 14v2.5"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </Svg>
  );
}

/**
 * Clean SVG Calendar Icon
 */
export function CalendarIcon({ size = 18, color = '#687076' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7z"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M16 3v4M8 3v4M4 11h16" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </Svg>
  );
}

/**
 * Clean SVG User / Profile Icon
 */
export function UserIcon({ size = 18, color = '#687076' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/**
 * Clean SVG Camera Icon
 */
export function CameraIcon({ size = 18, color = '#687076' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
