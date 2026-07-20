# Wexa AI Settings - Complete Implementation

## Overview
The Settings page (Dashboard Control Center) has been implemented with 11 tabs for managing the business, team, AI, and security settings.

## Database Schema (Prisma)

### New Tables Added:

1. **WorkspaceSettings**
   - `id`: Primary key
   - `workspaceId`: Unique reference to workspace
   - `email`: Business email
   - `phone`: Contact phone
   - `timezone`: User's timezone (default: Asia/Kolkata)
   - `language`: Interface language (default: en)
   - `logo`: Business logo URL

2. **NotificationSettings**
   - `id`: Primary key
   - `workspaceId`: Unique reference to workspace
   - `emailNotifications`: Boolean flag
   - `whatsappAlerts`: Boolean flag
   - `newConversation`: Alert on new conversation
   - `broadcastCompleted`: Alert when broadcast finishes
   - `paymentFailed`: Alert on payment failure

3. **SecuritySettings**
   - `id`: Primary key
   - `workspaceId`: Unique reference to workspace
   - `twoFactorEnabled`: 2FA status

4. **ApiKey**
   - `id`: Primary key
   - `workspaceId`: Workspace reference (non-unique, supports multiple keys)
   - `name`: Key name
   - `key`: Unique API key
   - `secret`: API secret
   - `lastUsed`: Timestamp of last use

5. **WebhookSettings**
   - `id`: Primary key
   - `workspaceId`: Unique reference to workspace
   - `url`: Webhook endpoint URL
   - `events`: Array of events to trigger webhook
   - `active`: Enable/disable webhook

6. **ActivityLog**
   - `id`: Primary key
   - `workspaceId`: Workspace reference
   - `userId`: User reference
   - `action`: Action description
   - `ipAddress`: IP address of action
   - `userAgent`: Browser/client info
   - `createdAt`: Timestamp

## API Routes

### GET /api/settings
**Query Params**: `workspaceId`
**Returns**: All settings data for a workspace

### PATCH /api/settings/general
**Query Params**: `workspaceId`
**Body**: `{ email, phone, timezone, language, logo }`

### PATCH /api/settings/notifications
**Query Params**: `workspaceId`
**Body**: `{ emailNotifications, whatsappAlerts, newConversation, broadcastCompleted, paymentFailed }`

### PATCH /api/settings/security
**Query Params**: `workspaceId`
**Body**: `{ twoFactorEnabled }`

### PATCH /api/settings/ai
**Query Params**: `workspaceId`
**Body**: `{ model, systemPrompt, temperature, language, autoReply, fallbackType }`

### PATCH /api/settings/webhooks
**Query Params**: `workspaceId`
**Body**: `{ url, events, active }`

### GET/POST /api/settings/api-keys
**GET Query Params**: `workspaceId`
**POST Query Params**: `workspaceId`
**POST Body**: `{ name }`
**Response**: Returns masked API keys

### DELETE /api/settings/api-keys/[id]
**Query Params**: `workspaceId`
**Params**: `id` (API key ID)

### POST /api/settings/danger-zone
**Query Params**: `workspaceId`
**Body**: 
```json
{
  "action": "delete_workspace|export_data|disconnect_whatsapp|delete_all_contacts",
  "confirmation": true
}
```

## UI Components

All components are located in `src/components/settings/`:

1. **SettingsSidebar.tsx**
   - Navigation sidebar with 11 tabs
   - Active tab highlighting
   - Responsive design

2. **GeneralSettings.tsx**
   - Business email, phone, timezone, language
   - Logo upload URL
   - Save functionality

3. **WorkspaceSettings.tsx**
   - Display-only workspace information
   - Workspace name, slug, ID, creation date
   - Action buttons for rename and transfer

4. **TeamSettings.tsx**
   - Display team members with roles
   - Member management (add/remove)
   - Permission settings

5. **AIAgentSettings.tsx**
   - AI model selection
   - System prompt configuration
   - Temperature slider for creativity control
   - Language selection
   - Fallback action setting

6. **WhatsAppSettings.tsx**
   - Connected WhatsApp account display
   - Business name, phone number, status
   - Sync templates button
   - Disconnect option

7. **NotificationSettings.tsx**
   - Toggle switches for notification types
   - Email, WhatsApp, conversation, broadcast, payment alerts
   - Description for each notification type

8. **SecuritySettings.tsx**
   - Change password form
   - 2FA enable/disable toggle
   - Active sessions management
   - Login activity history

9. **ApiKeysSettings.tsx**
   - List all API keys (masked)
   - Generate new key
   - Delete key
   - Copy key to clipboard
   - Last used timestamp

10. **WebhooksSettings.tsx**
    - Webhook URL input
    - Event selection checkboxes
    - Example payload display
    - Save functionality

11. **BillingSettings.tsx**
    - Current plan display
    - Renewal date
    - Usage tracking with progress bars
    - Action buttons for upgrade/cancel

12. **DangerZoneSettings.tsx**
    - Delete workspace
    - Export data
    - Disconnect WhatsApp
    - Delete all contacts
    - Confirmation dialogs for each action

## Settings Page (`page.tsx`)

- Tab-based navigation
- Dynamic content rendering based on active tab
- Fetches settings on component mount
- Handles loading states
- Integrates all components

## Usage

### Access Settings
```
/dashboard/settings?workspaceId=wx_123456789
```

### Fetch Settings
```typescript
const response = await fetch(`/api/settings?workspaceId=${workspaceId}`);
const data = await response.json();
```

### Update Settings
```typescript
const response = await fetch(`/api/settings/general?workspaceId=${workspaceId}`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'support@abc.com',
    phone: '+91...',
    timezone: 'Asia/Kolkata',
    language: 'en',
  })
});
```

### Generate API Key
```typescript
const response = await fetch(`/api/settings/api-keys?workspaceId=${workspaceId}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'My API Key' })
});
const { data } = await response.json();
// data.key and data.secret are only shown once
```

## Features Implemented

✅ Database schema with 6 new tables
✅ 11 settings tabs with full UI
✅ API routes for all settings operations
✅ Upsert operations for settings
✅ API key generation with crypto
✅ Danger zone actions with confirmation
✅ Webhook configuration
✅ AI agent settings
✅ Notification preferences
✅ Security settings
✅ Team member management UI
✅ Workspace information display
✅ Billing information display
✅ Activity logging structure

## To Deploy

1. Run Prisma migration:
   ```bash
   npx prisma migrate deploy
   ```

2. Generate Prisma client:
   ```bash
   npx prisma generate
   ```

3. The settings page is ready to use at `/dashboard/settings?workspaceId=YOUR_WORKSPACE_ID`

## Security Considerations

- API keys are masked in responses (except during creation)
- API key secrets are stored separately and never returned after creation
- Danger zone actions require explicit confirmation
- All database modifications include proper validation
- Timestamps tracked for all actions and API key usage
