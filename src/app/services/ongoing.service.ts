import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import Store from 'electron-store';
import * as log from 'electron-log';

export interface OngoingEpisode {
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

@Injectable({
  providedIn: 'root'
})
export class OngoingService {
  private store: Store<any> = new Store({ name: "ongoing-episodes", accessPropertiesByDotNotation: false });

  ongoingEpisodes: BehaviorSubject<{ [guid: string]: OngoingEpisode }> = new BehaviorSubject<{ [guid: string]: OngoingEpisode }>({});

  constructor() {
    this.updateOngoingEpisodes();
    // Clean up old episodes on service initialization
    this.cleanupOldEpisodes();
  }

  private updateOngoingEpisodes = () => {
    const episodes = this.store.store as { [guid: string]: OngoingEpisode };
    this.ongoingEpisodes.next(episodes || {});
  }

  markAsOngoing = (episodeData: {
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
  }) => {
    const ongoingEpisode: OngoingEpisode = {
      ...episodeData,
      lastListened: new Date(),
      markedOngoingAt: new Date()
    };

    this.store.set(episodeData.guid, ongoingEpisode);
    this.updateOngoingEpisodes();
    log.info("Ongoing service :: Added " + episodeData.guid + " to ongoing episodes.");
  }

  updateProgress = (guid: string, currentTime: number, percentPlayed: number) => {
    const episode = this.store.get(guid) as OngoingEpisode;
    if (episode) {
      episode.currentTime = currentTime;
      episode.percentPlayed = percentPlayed;
      episode.lastListened = new Date();
      
      this.store.set(guid, episode);
      this.updateOngoingEpisodes();
    }
  }

  removeFromOngoing = (guid: string) => {
    this.store.delete(guid);
    this.updateOngoingEpisodes();
    log.info("Ongoing service :: Removed " + guid + " from ongoing episodes.");
  }

  getOngoingEpisode = (guid: string): OngoingEpisode | null => {
    return this.store.get(guid) as OngoingEpisode || null;
  }

  isOngoing = (guid: string): boolean => {
    return this.store.has(guid);
  }

  getOngoingEpisodesList = (): OngoingEpisode[] => {
    const episodes = this.store.store as { [guid: string]: OngoingEpisode };
    return Object.values(episodes || {}).sort((a, b) => 
      new Date(b.lastListened).getTime() - new Date(a.lastListened).getTime()
    );
  }

  // Clean up episodes older than 30 days
  private cleanupOldEpisodes = () => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const episodes = this.store.store as { [guid: string]: OngoingEpisode };
    let cleanedCount = 0;

    Object.entries(episodes || {}).forEach(([guid, episode]) => {
      const lastListened = new Date(episode.lastListened);
      if (lastListened < thirtyDaysAgo) {
        this.store.delete(guid);
        cleanedCount++;
      }
    });

    if (cleanedCount > 0) {
      this.updateOngoingEpisodes();
      log.info(`Ongoing service :: Cleaned up ${cleanedCount} old ongoing episodes.`);
    }
  }

  // Clear all ongoing episodes (for user preference/privacy)
  clearAllOngoing = () => {
    this.store.clear();
    this.updateOngoingEpisodes();
    log.info("Ongoing service :: Cleared all ongoing episodes.");
  }
} 