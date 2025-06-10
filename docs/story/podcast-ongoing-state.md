# Podcast Ongoing State Feature Story

## Overview
Implement a new podcast state called "ongoing" that tracks episodes that have been listened to for more than 10% of their duration. This feature will save the listening position and allow users to resume podcasts from where they left off, even after switching to other episodes.

## User Stories

### Core User Stories
1. **As a user, when I listen to more than 10% of a podcast episode**, the episode should be automatically marked as "ongoing"
2. **As a user, I want my listening position to be saved** so that I can resume from where I left off
3. **As a user, when I return to an ongoing episode**, it should automatically continue from my saved position
4. **As a user, I want to see visual indicators** for episodes that are in an "ongoing" state
5. **As a user, I want to see the progress percentage** for ongoing episodes in the episode list

## Technical Implementation Tasks

### 1. Backend/Service Layer Tasks

#### 1.1 Create Ongoing Episodes Service
- **File**: `src/app/services/ongoing.service.ts`
- **Functionality**:
  - Store ongoing episodes data in electron-store
  - Track episodes with >10% progress
  - Save and retrieve listening positions
  - Mark episodes as ongoing/completed
  - Get ongoing episodes list
  - Remove from ongoing when episode is completed
- **Data Model**:
```typescript
interface OngoingEpisode {
  guid: string;
  title: string;
  description: string;
  src: string;
  duration: number;
  currentTime: number;
  percentPlayed: number;
  podcastTitle: string;
  podcastRSS: string;
  podcastImage: string;
  episodeImage?: string;
  lastListened: Date;
  markedOngoingAt: Date;
}
```
- **Storage Schema**: `ongoing-episodes` key in electron-store

#### 1.2 Extend Audio Service
- **File**: `src/app/services/audio.service.ts`
- **Modifications needed**:
  - Import `OngoingService`
  - Enhance `onTimeUpdate()` method to check for 10% threshold
  - Add logic to save progress for ongoing episodes
  - Modify `loadAudio()` to check for and restore saved position
  - Add method `checkOngoingThreshold()` to mark episodes as ongoing
  - Update `onEnded()` to remove episode from ongoing state

#### 1.3 Enhance Episode Status Circle Logic
- **Files to modify**:
  - `src/app/podcast/podcast.component.html`
  - `src/app/podcast/podcast.component.css`
- **Implementation Details**:
  - Extend existing `faCircle`/`faCheckCircle` icon logic
  - Add CSS classes for ongoing state styling
  - Use CSS `conic-gradient` or `clip-path` for percentage fill effect
  - Apply primary color border when episode is 10%+ listened
  - Create smooth visual transition from empty → border → progressive fill → complete

### 2. Component Enhancement Tasks

#### 2.1 Update Podcast Component
- **Files to modify**:
  - `src/app/podcast/podcast.component.ts`
  - `src/app/podcast/podcast.component.html`
  - `src/app/podcast/podcast.component.css`

**Component Features**:
- Subscribe to ongoing episodes from `OngoingService`
- Enhance existing episode status circles with progress visualization
- Apply primary color border and proportional fill to ongoing episode circles
- Add resume functionality in episode actions dropdown
- Show "Resume" button instead of "Play" for ongoing episodes
- Extend existing faCircle/faCheckCircle logic to include ongoing state styling

#### 2.2 Update Episode List Display
- **Visual Indicators**:
  - Enhance existing episode status circle with progress visualization
  - Circle border: Primary color for episodes with 10%+ progress
  - Circle fill: Primary color filled proportionally to listening progress percentage
  - "Resume" text with time position (e.g., "Resume from 12:34") in episode metadata
  - Maintain existing played/unplayed circle logic, extend for ongoing state

### 3. Progress Tracking Enhancement

#### 3.1 Enhanced Time Tracking
- **Real-time Progress Monitoring**:
  - Monitor `percentPlayed` from `AudioService`
  - Trigger ongoing state when threshold (10%) is reached
  - Continuously save progress every 5-10 seconds during playback
  - Handle pause/resume states appropriately

#### 3.2 Position Restoration
- **Resume Functionality**:
  - Check for saved position when loading episodes
  - Restore `currentTime` from ongoing episodes data
  - Show resume confirmation dialog (optional)
  - Handle edge cases (episode moved, RSS changed, etc.)

### 4. UI/UX Enhancement Tasks

#### 4.1 Episode State Visual Design
- **Ongoing Episode Indicators**:
  - Use existing episode status circle (faCircle/faCheckCircle)
  - Border: Primary color when episode is 10% or more listened
  - Fill: Primary color filled to match percentage listened (e.g., 34% fill for 34% progress)
  - Visual progression: Empty circle → Primary border at 10% → Progressively filled with primary color → Fully filled at 100%
  - Timestamp showing "Resume from XX:XX" in episode details
  
#### 4.2 Player Enhancement
- **Resume Experience**:
  - Toast notification when resuming: "Resuming from XX:XX"
  - Smooth transition to saved position
  - Optional: "Start from beginning" option in episode dropdown
  - Progress restoration happens automatically on load

#### 4.3 Episode Actions Menu
- **Enhanced Dropdown Menu**:
  - "Resume from XX:XX" option for ongoing episodes
  - "Start from beginning" option
  - "Mark as completed" option
  - "Remove from ongoing" option

### 5. Data Management Tasks

#### 5.1 Ongoing Episodes Storage
- **Persistence Strategy**:
  - Use electron-store with dedicated key `ongoing-episodes`
  - Store as object with GUID as key for fast lookup
  - Include cleanup logic for old/stale entries
  - Handle storage size limitations

#### 5.2 State Transitions
- **Episode State Flow**:
  ```
  Unplayed → Ongoing (at 10%) → Played (at 100%)
             ↓
         Can be removed manually
  ```
- **Auto-cleanup**: Remove episodes older than 30 days from ongoing state
- **Completion Logic**: Move from ongoing to played when episode reaches 95-100%

### 6. Integration with Existing Features

#### 6.1 Waitlist Integration
- **Enhanced Waitlist**:
  - Show ongoing status in waitlist items
  - Resume from saved position when playing from waitlist
  - Maintain progress tracking in waitlist flow

#### 6.2 Played Episodes Integration
- **Coordination with PlayedService**:
  - Remove from ongoing when marked as played
  - Don't mark as ongoing if already marked as played
  - Handle manual played/unplayed toggles

### 7. Performance Considerations

#### 7.1 Efficient Progress Tracking
- **Optimization Strategies**:
  - Throttle progress saves to every 5-10 seconds
  - Use debounced writes to storage
  - Minimize redundant storage operations
  - Cache ongoing episodes in memory

#### 7.2 UI Performance
- **Rendering Optimization**:
  - Use OnPush change detection where possible
  - Minimize DOM updates for progress indicators
  - Lazy load progress calculations

### 8. Error Handling and Edge Cases

#### 8.1 Data Integrity
- **Validation Logic**:
  - Verify episode still exists before restoring position
  - Handle corrupted ongoing episodes data
  - Graceful fallback when restore fails
  - Validate time positions against episode duration

#### 8.2 User Experience Edge Cases
- **Seamless Experience**:
  - Handle rapid episode switching
  - Manage multiple episodes becoming ongoing simultaneously
  - Deal with network interruptions during saves
  - Handle app crashes during playback

### 9. User Settings and Preferences

#### 9.1 Configurable Thresholds
- **Optional Enhancements**:
  - Allow users to configure the 10% threshold
  - Option to disable ongoing state feature
  - Setting for auto-resume vs. prompt to resume
  - Cleanup interval preferences

#### 9.2 Privacy Considerations
- **Data Handling**:
  - Local storage only (no cloud sync in this implementation)
  - Option to clear all ongoing episodes
  - Respect user's played status preferences

### 10. Testing Strategy

#### 10.1 Unit Tests
- **OngoingService Tests**:
  - Test threshold detection (10% logic)
  - Test position saving/restoration
  - Test state transitions
  - Test cleanup operations

#### 10.2 Integration Tests
- **Full User Flow Tests**:
  - Listen to 10% → mark as ongoing → switch episodes → resume
  - Test with various episode lengths
  - Test concurrent episodes becoming ongoing
  - Test restoration after app restart

### 11. Implementation Phases

#### Phase 1: Core Service Implementation
1. Create `OngoingService` with basic functionality
2. Integrate with `AudioService` for progress tracking
3. Implement 10% threshold detection

#### Phase 2: UI Integration
1. Update podcast component to show ongoing indicators
2. Add resume functionality to episode actions
3. Implement visual progress indicators

#### Phase 3: Enhancement and Polish
1. Add user preferences
2. Implement cleanup logic
3. Performance optimizations
4. Comprehensive testing

## Success Criteria

### Functional Requirements
- [x] Episodes automatically marked as ongoing after 10% listening
- [x] Listening position accurately saved and restored
- [x] Visual indicators clearly show ongoing status
- [x] Seamless resume experience
- [x] Integration with existing podcast states

### User Experience Goals
- [x] Intuitive visual feedback for ongoing episodes
- [x] One-click resume functionality
- [x] No disruption to current listening workflow
- [x] Clear progress indication in episode lists
- [x] Smooth transitions between episodes

### Technical Requirements
- [x] Reliable data persistence
- [x] Efficient progress tracking
- [x] Minimal performance impact
- [x] Proper error handling
- [x] Clean integration with existing codebase

## Future Enhancements
- Cross-device sync for ongoing episodes
- Smart recommendations based on ongoing episodes
- Batch operations for ongoing episodes management
- Analytics on listening patterns
- Integration with podcast discovery features 