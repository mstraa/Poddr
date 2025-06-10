import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ToastService } from './toast.service';
import Store from 'electron-store';
import * as log from 'electron-log';

export interface WaitlistEpisode {
	guid: string;
	title: string;
	description: string;
	src: string;
	duration: number;
	published: Date;
	image?: string;
	podcastTitle: string;
	podcastRSS: string;
	podcastImage: string;
	order: number;
	addedAt: Date;
}

@Injectable({
	providedIn: 'root'
})
export class WaitlistService {
	private store: Store<any> = new Store({ name: "waitlist" });
	
	public waitlist: BehaviorSubject<WaitlistEpisode[]> = new BehaviorSubject<WaitlistEpisode[]>([]);

	constructor(private toast: ToastService) {
		this.updateWaitlist();
		log.info("Waitlist service :: Initialized waitlist service.");
	}

	private updateWaitlist = (): void => {
		const episodes = this.store.get('episodes', []) as WaitlistEpisode[];
		// Sort by order to maintain queue sequence
		episodes.sort((a, b) => a.order - b.order);
		this.waitlist.next(episodes);
	}

	addToWaitlist = (episode: any, podcastTitle: string, podcastRSS: string, podcastImage: string): void => {
		const existingEpisodes = this.store.get('episodes', []) as WaitlistEpisode[];
		
		// Check if episode already exists in waitlist
		if (existingEpisodes.some(e => e.guid === episode.guid)) {
			this.toast.toastError("Episode is already in waitlist!");
			return;
		}

		const waitlistEpisode: WaitlistEpisode = {
			guid: episode.guid,
			title: episode.title,
			description: episode.description,
			src: episode.enclosure ? episode.enclosure.url : '',
			duration: episode.duration || 0,
			published: episode.published,
			image: episode.image,
			podcastTitle: podcastTitle,
			podcastRSS: podcastRSS,
			podcastImage: podcastImage,
			order: existingEpisodes.length,
			addedAt: new Date()
		};

		existingEpisodes.push(waitlistEpisode);
		this.store.set('episodes', existingEpisodes);
		this.updateWaitlist();
		this.toast.toastSuccess("Added to waitlist!");
		log.info("Waitlist service :: Added episode to waitlist: " + episode.title);
	}

	removeFromWaitlist = (guid: string): void => {
		const episodes = this.store.get('episodes', []) as WaitlistEpisode[];
		const filteredEpisodes = episodes.filter(e => e.guid !== guid);
		
		// Reorder remaining episodes
		filteredEpisodes.forEach((episode, index) => {
			episode.order = index;
		});
		
		this.store.set('episodes', filteredEpisodes);
		this.updateWaitlist();
		this.toast.toastError("Removed from waitlist");
		log.info("Waitlist service :: Removed episode from waitlist: " + guid);
	}

	reorderWaitlist = (episodes: WaitlistEpisode[]): void => {
		// Update order property for each episode
		episodes.forEach((episode, index) => {
			episode.order = index;
		});
		
		this.store.set('episodes', episodes);
		this.updateWaitlist();
		log.info("Waitlist service :: Reordered waitlist");
	}

	getNextEpisode = (): WaitlistEpisode | null => {
		const episodes = this.waitlist.value;
		return episodes.length > 0 ? episodes[0] : null;
	}

	removeFirstEpisode = (): void => {
		const episodes = this.store.get('episodes', []) as WaitlistEpisode[];
		if (episodes.length > 0) {
			episodes.shift(); // Remove first episode
			// Reorder remaining episodes
			episodes.forEach((episode, index) => {
				episode.order = index;
			});
			this.store.set('episodes', episodes);
			this.updateWaitlist();
			log.info("Waitlist service :: Removed first episode from waitlist");
		}
	}

	clearWaitlist = (): void => {
		this.store.set('episodes', []);
		this.updateWaitlist();
		this.toast.toastError("Cleared waitlist");
		log.info("Waitlist service :: Cleared waitlist");
	}

	getCurrentWaitlist = (): WaitlistEpisode[] => {
		return this.waitlist.value;
	}
} 