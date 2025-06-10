# Waitlist Feature Story

## Overview
Implement a waitlist/queue feature that allows users to queue multiple podcasts for continuous playback. Users can add episodes to a waitlist, manage the queue, and have episodes automatically play in sequence.

## User Stories

### Core User Stories
1. **As a user, I want to access a waitlist page** so that I can view and manage my queued episodes
2. **As a user, I want to add episodes to my waitlist** so that I can queue them for later listening
3. **As a user, I want to remove episodes from my waitlist** so that I can control what I listen to
4. **As a user, I want to reorder episodes in my waitlist** so that I can prioritize what I want to hear next
5. **As a user, I want episodes to automatically play from my waitlist** so that I have continuous listening experience

## Technical Implementation Tasks

### 1. Backend/Service Layer Tasks

#### 1.1 Create Waitlist Service
- **File**: `src/app/services/waitlist.service.ts`
- **Functionality**:
  - Store waitlist data in electron-store
  - Add episode to waitlist
  - Remove episode from waitlist
  - Reorder episodes in waitlist
  - Get current waitlist
  - Get next episode in queue
  - Clear waitlist
- **Dependencies**: Similar to `favourites.service.ts` but for queue management

#### 1.2 Extend Audio Service
- **File**: `src/app/services/audio.service.ts`
- **Modifications needed**:
  - Import `WaitlistService`
  - Modify `onEnded()` method to check for next episode in waitlist
  - Add method `playNextInWaitlist()` 
  - Add logic to automatically play next episode when current episode ends

### 2. Component Development Tasks

#### 2.1 Create Waitlist Component
- **Files to create**:
  - `src/app/waitlist/waitlist.component.ts`
  - `src/app/waitlist/waitlist.component.html`
  - `src/app/waitlist/waitlist.component.css`
  - `src/app/waitlist/waitlist.component.spec.ts`

**Component Features**:
- Display list of queued episodes
- Show episode artwork, title, podcast name, duration
- Remove episode functionality
- Drag and drop reordering (using Angular CDK)
- Play episode directly from waitlist
- Clear all episodes action
- Empty state when no episodes queued

#### 2.2 Integrate Drag and Drop
- **Dependencies**: Add Angular CDK to `package.json`
- **Implementation**: Use `@angular/cdk/drag-drop` for reordering episodes
- **Features**: Visual feedback during drag, smooth animations

### 3. Navigation and Routing Tasks

#### 3.1 Add Waitlist Route
- **File**: `src/app/app-routing.module.ts`
- **Changes**:
  - Import `WaitlistComponent`
  - Add route: `{ path: "waitlist", component: WaitlistComponent }`

#### 3.2 Update Sidenav
- **File**: `src/app/sidenav/sidenav.component.html`
- **Changes**:
  - Add waitlist menu item with appropriate icon (faList or faClipboardList)
  - Position between "Favourites" and "Settings"
  - Add `routerLinkActive="active"` for active state

#### 3.3 Update Sidenav Component
- **File**: `src/app/sidenav/sidenav.component.ts`
- **Changes**:
  - Import waitlist icon from FontAwesome
  - Add icon to component properties

### 4. Update Existing Components

#### 4.1 Extend Podcast Component Dropdown Menu
- **File**: `src/app/podcast/podcast.component.html`
- **Changes**:
  - Add "Add to waitlist" option in episode dropdown menu (`.dropdown-content.podcast-dd`)
  - Add FontAwesome icon (faPlus or faListUl)
  - Position after "Mark as played/unplayed" options

#### 4.2 Update Podcast Component Logic
- **File**: `src/app/podcast/podcast.component.ts`
- **Changes**:
  - Import `WaitlistService`
  - Add `addToWaitlist(episode)` method
  - Inject service in constructor
  - Add success toast notification when episode added

### 5. Module Configuration Tasks

#### 5.1 Update App Module
- **File**: `src/app/app.module.ts`
- **Changes**:
  - Import `WaitlistComponent`
  - Add to `declarations` array
  - Import `DragDropModule` from `@angular/cdk/drag-drop`
  - Add to `imports` array

#### 5.2 Package Dependencies
- **File**: `package.json`
- **Changes**:
  - Add `@angular/cdk` for drag and drop functionality
  - Ensure version compatibility with existing Angular version

### 6. UI/UX Enhancement Tasks

#### 6.1 Waitlist Page Design
- **Empty State**: 
  - Friendly message when waitlist is empty
  - Call-to-action to browse podcasts
  - Illustration or icon
- **Populated State**:
  - Clean episode cards with hover effects
  - Clear visual hierarchy
  - Consistent spacing and typography
- **Drag Indicators**:
  - Drag handle icons
  - Visual feedback during drag operations
  - Drop zones indication

#### 6.2 Episode Card Design
- **Information Display**:
  - Episode artwork (thumbnail)
  - Episode title (truncated if long)
  - Podcast name
  - Duration
  - Publication date
- **Actions**:
  - Remove from waitlist (X button)
  - Play immediately button
  - Drag handle for reordering

#### 6.3 Responsive Design
- **Mobile Considerations**:
  - Touch-friendly drag and drop
  - Appropriate touch targets
  - Responsive layout for smaller screens

### 7. Data Structure Tasks

#### 7.1 Waitlist Data Model
```typescript
interface WaitlistEpisode {
  guid: string;           // Unique episode identifier
  title: string;          // Episode title
  description: string;    // Episode description
  src: string;           // Audio file URL
  duration: number;       // Duration in seconds
  published: Date;        // Publication date
  image?: string;         // Episode artwork URL
  podcastTitle: string;   // Parent podcast title
  podcastRSS: string;     // Parent podcast RSS URL
  podcastImage: string;   // Parent podcast artwork
  order: number;          // Position in waitlist
  addedAt: Date;         // When added to waitlist
}
```

#### 7.2 Storage Schema
- **Key**: `waitlist`
- **Format**: Array of `WaitlistEpisode` objects
- **Persistence**: electron-store for local storage

### 8. Error Handling and Edge Cases

#### 8.1 Network Issues
- Handle cases where episode URLs become unavailable
- Graceful fallback when auto-play fails
- User notification for network errors

#### 8.2 Storage Limitations
- Handle large waitlist sizes
- Cleanup old entries if needed
- Validate data integrity on app startup

#### 8.3 Concurrent Playback
- Ensure only one episode plays at a time
- Handle waitlist changes during playback
- Update UI state consistently

### 9. Testing Tasks

#### 9.1 Unit Tests
- **WaitlistService**: Test all CRUD operations
- **WaitlistComponent**: Test UI interactions
- **AudioService**: Test auto-play functionality

#### 9.2 Integration Tests
- Test full user workflow from adding to auto-play
- Test drag and drop functionality
- Test navigation between components

#### 9.3 User Testing
- Validate intuitive user experience
- Test accessibility features
- Performance testing with large waitlists

### 10. Documentation Tasks

#### 10.1 Code Documentation
- JSDoc comments for all public methods
- README updates for new feature
- Architecture documentation updates

#### 10.2 User Documentation
- Help section for waitlist feature
- Tooltips and user guidance
- Feature announcement preparation

## Implementation Priority

### Phase 1: Core Functionality (High Priority)
1. Create WaitlistService
2. Create basic WaitlistComponent
3. Add navigation and routing
4. Extend podcast component dropdown

### Phase 2: Auto-play (High Priority)
1. Extend AudioService for auto-play
2. Integration testing for auto-play flow

### Phase 3: Enhanced UX (Medium Priority)
1. Implement drag and drop
2. Polish UI design
3. Add empty states and animations

### Phase 4: Polish (Low Priority)
1. Comprehensive error handling
2. Performance optimizations
3. Accessibility improvements
4. Documentation completion

## Acceptance Criteria

### Must Have
- [ ] Users can access waitlist page from sidenav
- [ ] Users can add episodes to waitlist from podcast page
- [ ] Users can remove episodes from waitlist
- [ ] Episodes automatically play in sequence
- [ ] Waitlist persists between app sessions

### Should Have
- [ ] Users can reorder episodes via drag and drop
- [ ] Clear visual feedback for all actions
- [ ] Responsive design for different screen sizes
- [ ] Error handling for edge cases

### Could Have
- [ ] Batch operations (clear all, add multiple)
- [ ] Waitlist statistics and analytics
- [ ] Export/import waitlist functionality
- [ ] Smart recommendations for waitlist

## Success Metrics
- User engagement with waitlist feature
- Increased session duration due to auto-play
- Positive user feedback on queue management
- Reduced manual intervention in episode selection

## Dependencies
- Angular CDK (for drag and drop)
- FontAwesome (for icons)
- electron-store (for persistence)
- Existing services (Audio, Toast, etc.)

## Risks and Mitigation
- **Risk**: Complex drag and drop implementation
  - **Mitigation**: Use proven Angular CDK library
- **Risk**: Auto-play functionality interfering with user control
  - **Mitigation**: Clear user settings and override options
- **Risk**: Performance issues with large waitlists
  - **Mitigation**: Virtual scrolling and pagination if needed 