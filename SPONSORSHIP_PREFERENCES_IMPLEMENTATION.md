# Sponsorship Preferences Feature Implementation

## 🎯 Overview

This feature allows sponsors to configure their sponsorship preferences, specifying:
- Types of sponsorship they're willing to provide
- Tier level for each sponsorship type (Complimentary, Partial Subsidy, Full Sponsorship, Premium/Exclusive)
- Collaboration preference (Active Collaboration vs Passive Listing)
- Custom notes and descriptions

## 📁 Files Created/Modified

### Backend Files

#### 1. Schema: `backend/src/sponsors/schemas/sponsorship-preferences.schema.ts`
- Defines the MongoDB schema for sponsorship preferences
- Includes enums for sponsorship types, tiers, and collaboration preferences
- Contains validation and indexing for optimized queries

#### 2. DTOs: `backend/src/sponsors/dto/sponsor.dto.ts` (Modified)
- Added `CreateSponsorshipPreferencesDto` and `UpdateSponsorshipPreferencesDto`
- Added `SponsorshipPreferenceItemDto` for individual preference items
- Includes proper validation decorators

#### 3. Service: `backend/src/sponsors/sponsors.service.ts` (Modified)
- Added methods for CRUD operations on sponsorship preferences
- Added search functionality to find sponsors by preferences
- Includes proper permission checking (only owners can modify)

#### 4. Controller: `backend/src/sponsors/sponsors.controller.ts` (Modified)
- Added REST endpoints for sponsorship preferences management
- Includes search endpoint for finding sponsors by preferences
- Proper authentication and authorization guards

#### 5. Module: `backend/src/sponsors/sponsors.module.ts` (Modified)
- Added SponsorshipPreferences schema to MongoDB imports

### Frontend Files

#### 1. Types: `frontend/src/types/sponsor.ts` (Modified)
- Added TypeScript interfaces and enums for sponsorship preferences
- Mirrors backend schema structure for type safety

#### 2. Service: `frontend/src/services/sponsor.service.ts` (Modified)
- Added API methods for sponsorship preferences operations
- Includes error handling and proper typing

#### 3. Components: 
- `frontend/src/components/SponsorshipPreferencesForm.tsx` - Management form for owners
- `frontend/src/components/SponsorshipPreferencesDisplay.tsx` - Read-only display for public view

#### 4. Pages Modified:
- `frontend/src/pages/SponsorProfilePage.tsx` - Added "Sponsorships" tab
- `frontend/src/pages/SponsorDashboard.tsx` - Added "Sponsorship Preferences" tab for management

## 🔗 API Endpoints

### Sponsorship Preferences Endpoints

```
POST   /api/sponsors/:username/preferences           - Create preferences
GET    /api/sponsors/:username/preferences           - Get preferences (public)
PUT    /api/sponsors/:username/preferences           - Update preferences (owner only)
DELETE /api/sponsors/:username/preferences           - Delete preferences (owner only)
GET    /api/sponsors/search/by-preferences           - Search sponsors by preferences
```

### API Examples

#### Create Sponsorship Preferences
```bash
POST /api/sponsors/tech-sponsor/preferences
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "sponsorshipTypes": [
    {
      "type": "Location Hosting",
      "tier": "Full Sponsorship",
      "customDescription": "5000 sq ft event space with AV equipment"
    },
    {
      "type": "Product Samples & Swag",
      "tier": "Complimentary",
      "customDescription": "Tech accessories and branded items"
    }
  ],
  "collaborationPreference": "Actively Collaborate",
  "customNotes": "We focus on tech and sustainability events"
}
```

#### Search Sponsors by Preferences
```bash
GET /api/sponsors/search/by-preferences?sponsorshipTypes=Location%20Hosting,Technology%20Equipment&collaborationPreference=Actively%20Collaborate&limit=10
```

## 🎨 UI Components

### SponsorshipPreferencesForm
**Purpose**: Allows sponsor owners to configure their sponsorship preferences
**Features**:
- Multi-select sponsorship types with tier selection
- Custom descriptions for each sponsorship type
- Collaboration preference radio buttons
- Custom notes textarea
- Real-time validation and saving

**Usage**:
```tsx
<SponsorshipPreferencesForm
  sponsorUsername="tech-sponsor"
  isOwner={true}
  onSave={(preferences) => console.log('Saved:', preferences)}
/>
```

### SponsorshipPreferencesDisplay
**Purpose**: Shows sponsorship preferences to public users
**Features**:
- Clean, read-only display of preferences
- Color-coded tier badges
- Icons for different sponsorship types
- Collaboration style indicator
- Call-to-action for potential collaborators

**Usage**:
```tsx
<SponsorshipPreferencesDisplay
  sponsorUsername="tech-sponsor"
  className="my-custom-styles"
/>
```

## 📋 Sponsorship Types Available

1. **Location Hosting** 🏢
2. **Pop-up Space** 🏢
3. **Product Samples & Swag** 🎁
4. **Raffle & Giveaway Donations** 🎁
5. **Branded Merchandise** 🎁
6. **Event Sponsorship Funds** 💰
7. **Grants & Donations** 💰
8. **Prize Money** 💰
9. **Catering & Refreshments** 🍕
10. **Entertainment Sponsorship** 🎵
11. **Photography/Videography** 📸
12. **Event Staffing & Volunteers** 👥
13. **Decor & Production Support** ✨
14. **Event Promotion** 📢
15. **Cross-Promotion** 📢
16. **Advertising Credit** 📢
17. **Influencer Partnership** 📢
18. **Consulting / Workshops** 🎓
19. **Logistics / Transportation** 🚛
20. **Technology / Equipment** 💻
21. **Printing & Materials** 📄
22. **Software Access / Tools** 💻
23. **Insurance & Compliance** 📋

## 🏷️ Sponsorship Tiers

- **Complimentary** (Free) - Green badge
- **Partial Subsidy** - Blue badge
- **Full Sponsorship** - Purple badge
- **Premium / Exclusive** - Yellow badge

## 🤝 Collaboration Preferences

- **Actively Collaborate**: Sponsor wants to participate in event planning
- **Passive**: Sponsor provides support but minimal planning involvement

## 🔍 Search & Discovery

Clubs can search for sponsors based on:
- Specific sponsorship types needed
- Collaboration preference
- Location/service area
- Pagination support

## 📱 User Experience

### For Sponsors (Owners)
1. Navigate to Sponsor Dashboard
2. Click "Sponsorship Preferences" tab
3. Select sponsorship types and set tiers
4. Add custom descriptions and notes
5. Choose collaboration preference
6. Save preferences

### For Clubs (Seeking Sponsorship)
1. Visit sponsor profile
2. Click "Sponsorships" tab
3. View available sponsorship types and tiers
4. See collaboration style and custom notes
5. Contact sponsor or send collaboration request

## 🛡️ Security & Permissions

- Only sponsor owners can create/update/delete preferences
- Public read access for preferences (when set)
- JWT authentication required for modifications
- Proper input validation and sanitization

## 📊 Data Structure Example

See `example-sponsorship-preferences.json` for a complete example of the data structure.

## 🚀 Deployment Notes

1. Run database migrations if needed
2. Ensure MongoDB indexes are created for optimal performance
3. Update environment variables if required
4. Test API endpoints with proper authentication

## 🔧 Development

### Adding New Sponsorship Types
1. Update the `SponsorshipType` enum in both backend schema and frontend types
2. Add appropriate icon mapping in frontend components
3. Test validation and display

### Extending Functionality
- Add email notifications for preference updates
- Implement sponsorship matching algorithms
- Add analytics for preference popularity
- Create preference templates for common industries

## 📈 Benefits

1. **For Sponsors**: Clear communication of what they offer
2. **For Clubs**: Easy discovery of relevant sponsors
3. **For Platform**: Better matching and user experience
4. **For Collaboration**: Transparent expectations and capabilities

## 🔮 Future Enhancements

- Automatic sponsor-club matching based on preferences
- Preference analytics and recommendations
- Industry-specific preference templates
- Integration with event planning tools
- Automated collaboration request routing 