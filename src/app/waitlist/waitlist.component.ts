import { Component, OnInit, OnDestroy, NgZone } from '@angular/core';
import { WaitlistService, WaitlistEpisode } from '../services/waitlist.service';
import { AudioService } from '../services/audio.service';
import { ToastService } from '../services/toast.service';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { faPlay, faTimes, faList, faTrash, faGripVertical } from '@fortawesome/free-solid-svg-icons';
import * as log from 'electron-log';

@Component({
	selector: 'app-waitlist',
	templateUrl: './waitlist.component.html',
	styleUrls: ['./waitlist.component.css'],
	standalone: false
})
export class WaitlistComponent implements OnInit, OnDestroy {
	private waitlistSubscription: Subscription;
	private audioGuidSubscription: Subscription;

	public episodes: WaitlistEpisode[] = [];
	public currentGUID: string = "";
	
	public faPlay = faPlay;
	public faTimes = faTimes;
	public faList = faList;
	public faTrash = faTrash;
	public faGripVertical = faGripVertical;

	constructor(
		private waitlistService: WaitlistService,
		private audioService: AudioService,
		private toast: ToastService,
		private router: Router,
		private zone: NgZone
	) { }

	ngOnInit() {
		this.waitlistSubscription = this.waitlistService.waitlist.subscribe(episodes => {
			this.zone.run(() => {
				this.episodes = episodes;
			});
		});

		this.audioGuidSubscription = this.audioService.guid.subscribe(guid => {
			this.currentGUID = guid;
		});

		log.info("Waitlist component :: Initialized");
	}

	ngOnDestroy() {
		if (this.waitlistSubscription) this.waitlistSubscription.unsubscribe();
		if (this.audioGuidSubscription) this.audioGuidSubscription.unsubscribe();
	}

	playEpisode = (episode: WaitlistEpisode): void => {
		const podcastObject = {
			src: episode.src,
			episodeTitle: episode.title,
			description: episode.description,
			guid: episode.guid,
			cover: episode.image
		};
		
		this.audioService.loadAudio(podcastObject, episode.podcastTitle, episode.podcastRSS, episode.podcastImage);
		this.audioService.play();
		log.info("Waitlist component :: Playing episode: " + episode.title);
	}

	removeEpisode = (episode: WaitlistEpisode): void => {
		this.waitlistService.removeFromWaitlist(episode.guid);
		log.info("Waitlist component :: Removed episode: " + episode.title);
	}

	clearWaitlist = (): void => {
		if (this.episodes.length === 0) {
			this.toast.toastError("Waitlist is already empty");
			return;
		}
		
		this.waitlistService.clearWaitlist();
		log.info("Waitlist component :: Cleared waitlist");
	}

	goToPodcast = (episode: WaitlistEpisode): void => {
		this.router.navigate(['/podcast', episode.podcastRSS]);
	}

	formatDuration = (duration: number): string => {
		if (!duration) return '--:--';
		
		const hours = Math.floor(duration / 3600);
		const minutes = Math.floor((duration % 3600) / 60);
		const seconds = duration % 60;
		
		if (hours > 0) {
			return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
		} else {
			return `${minutes}:${seconds.toString().padStart(2, '0')}`;
		}
	}

	drop = (event: CdkDragDrop<WaitlistEpisode[]>): void => {
		if (event.previousIndex !== event.currentIndex) {
			const episodesCopy = [...this.episodes];
			moveItemInArray(episodesCopy, event.previousIndex, event.currentIndex);
			
			// Update the waitlist order
			this.waitlistService.reorderWaitlist(episodesCopy);
			
			log.info("Waitlist component :: Reordered episodes");
			this.toast.toast("Waitlist reordered");
		}
	}
} 