// Simple icon generator using SVG and data URLs
import fs from 'fs';

function createSVGIcon(size) {
  return `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
    <!-- Orange background circle -->
    <circle cx="${size/2}" cy="${size/2}" r="${size/2}" fill="#f97316"/>
    
    <!-- Tractor icon in white -->
    <g transform="translate(${size*0.15}, ${size*0.2})" fill="white">
      <!-- Main body -->
      <rect x="${size*0.2}" y="${size*0.35}" width="${size*0.4}" height="${size*0.2}" rx="${size*0.02}" fill="white"/>
      
      <!-- Cabin -->
      <rect x="${size*0.35}" y="${size*0.2}" width="${size*0.25}" height="${size*0.2}" rx="${size*0.01}" fill="white"/>
      
      <!-- Large rear wheel -->
      <circle cx="${size*0.5}" cy="${size*0.65}" r="${size*0.08}" fill="white"/>
      <circle cx="${size*0.5}" cy="${size*0.65}" r="${size*0.05}" fill="#f97316"/>
      
      <!-- Small front wheel -->
      <circle cx="${size*0.25}" cy="${size*0.65}" r="${size*0.06}" fill="white"/>
      <circle cx="${size*0.25}" cy="${size*0.65}" r="${size*0.035}" fill="#f97316"/>
      
      <!-- Text fallback -->
      <text x="${size*0.37}" y="${size*0.45}" font-family="Arial" font-size="${size*0.3}" font-weight="bold" fill="white" text-anchor="middle">F</text>
    </g>
  </svg>`;
}

// Create SVG icons
fs.writeFileSync('static/icon.svg', createSVGIcon(512));
console.log('SVG icon created. You can use online converters to create PNG versions.');

// Create a simple colored square as fallback
const createSimpleIcon = (size) => `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="#f97316"/>
  <text x="${size/2}" y="${size/2 + size*0.1}" text-anchor="middle" fill="white" font-size="${size*0.4}" font-weight="bold">F</text>
</svg>`;

fs.writeFileSync('static/simple-icon.svg', createSimpleIcon(512));
console.log('Simple SVG icon created.');