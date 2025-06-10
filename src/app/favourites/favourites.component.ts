import { Component, OnDestroy, OnInit } from '@angular/core';
import { AudioService } from '../services/audio.service';
import { FavouritesService } from '../services/favourites.service';
import { OfflineService } from '../services/offline.service';
import { ToastService } from '../services/toast.service';
import { PlayedService } from '../services/played.service';
import { OngoingService } from '../services/ongoing.service';
import { WaitlistService } from '../services/waitlist.service';
import { faPlus, faTimes, faPlay, faEllipsisV, faCircle, faCheckCircle, faInfoCircle, faDownload } from '@fortawesome/free-solid-svg-icons';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-favourites',
    templateUrl: './favourites.component.html',
    styleUrls: ['./favourites.component.css'],
    standalone: false
})
export class FavouritesComponent implements OnInit, OnDestroy {
	private offlineSubscription: Subscription;
	private favSubscription: Subscription;
	private favEpisodesSubscription: Subscription;
	private playedSubscription: Subscription;
	private ongoingSubscription: Subscription;
	private offlineKeysSubscription: Subscription;

	public favourites: Array<Object> = [];
	public offlineEpisodes: Array<Object> = [];
	public offlineEpisodeKeys: string[] = [];
	public latestEpisodes: Array<Object> = [];
	public ongoingEpisodes: Array<Object> = [];
	public playedEpisodes: string[] = [];
	public content: string = 'latest';

	public faPlus = faPlus;
	public faTimes = faTimes;
	public faPlay = faPlay;
	public faEllipsisV = faEllipsisV;
	public faCircle = faCircle;
	public faCheckCircle = faCheckCircle;
	public faInfoCircle = faInfoCircle;
	public faDownload = faDownload;

	constructor(private audio: AudioService, private favService: FavouritesService, private offlineService: OfflineService, private toast: ToastService, private playedService: PlayedService, private ongoingService: OngoingService, private waitlistService: WaitlistService) { }

	ngOnInit() {
		this.favSubscription = this.favService.favourites.subscribe(value => {
			this.favourites = value;
		});
		this.offlineSubscription = this.offlineService.offlineEpisodes.subscribe(value => {
			this.offlineEpisodes = value;
		});
		this.favEpisodesSubscription = this.favService.latestEpisodes.subscribe(value => {
			this.latestEpisodes = value.sort((a, b) => {
				const aDate = new Date(a['date']);
				const bDate = new Date(b['date']);
				return aDate > bDate ? -1 : bDate > aDate ? 1 : 0;
			}).slice(0, 100);
		});
		this.playedSubscription = this.playedService.playedEpisodes.subscribe(value => {
			this.playedEpisodes = value;
		});
		this.offlineKeysSubscription = this.offlineService.offlineKeys.subscribe(value => {
			this.offlineEpisodeKeys = value;
		});
		this.ongoingSubscription = this.ongoingService.ongoingEpisodes.subscribe(value => {
			this.ongoingEpisodes = Object.values(value).sort((a: any, b: any) => 
				new Date(b.lastListened).getTime() - new Date(a.lastListened).getTime()
			);
		});
	}

	ngOnDestroy() {
		if (this.favSubscription) this.favSubscription.unsubscribe();
		if (this.offlineSubscription) this.offlineSubscription.unsubscribe();
		if (this.favEpisodesSubscription) this.favEpisodesSubscription.unsubscribe();
		if (this.playedSubscription) this.playedSubscription.unsubscribe();
		if (this.ongoingSubscription) this.ongoingSubscription.unsubscribe();
		if (this.offlineKeysSubscription) this.offlineKeysSubscription.unsubscribe();
	}

	remove = (rss): void => {
		this.toast.confirmModal().then((res) => {
			if (res.value) this.favService.removeFavourite(rss);
		});
	}

	add = (): void => {
		this.toast.inputRSSModal().then((res) => {
			if (res.value) this.favService.addFavourite(res.value);
		});
	}

	playEpisode = (episode) => {
		episode.episodeTitle = episode.title;
		this.audio.loadAudio(episode, episode.podcast, episode.rss, episode.cover);
		this.audio.play();
	}

	playOffline = (episode): void => {
		this.audio.loadAudio(episode, episode.author, episode.rss, "");
		this.audio.play();
	}

	removeOffline = (guid): void => {
		this.toast.confirmModal().then((res) => {
			if (res.value) this.offlineService.remove(guid);
		});
	}

	markAsPlayed = (guid): void => {
		this.playedService.markAsPlayed(guid);
	}

	unmarkAsPlayed = (guid): void => {
		this.playedService.unmarkAsPlayed(guid);
	}

	addToWaitlist = (episode): void => {
		this.waitlistService.addToWaitlist(episode, episode.podcast, episode.rss, episode.cover);
		this.toast.toastSuccess('Added to waitlist: ' + episode.title);
	}

	showDescription = (event, title, description): void => {
		event.stopPropagation();
		this.toast.modal(title, description);
	}

	download = (event, episode): void => {
		event.stopPropagation();
		this.offlineService.download(episode.podcast, episode.rss, episode);
	}

	removeDownload = (event, episode): void => {
		event.stopPropagation();
		this.offlineService.remove(episode.guid);
	}

	// Ongoing episode methods
	playOngoingEpisode = (episode): void => {
		const ongoingEpisode = episode;
		const podcast = {
			src: ongoingEpisode.src,
			episodeTitle: ongoingEpisode.title,
			description: ongoingEpisode.description,
			guid: ongoingEpisode.guid,
			cover: ongoingEpisode.episodeImage || ongoingEpisode.podcastImage
		};
		
		this.audio.loadAudio(podcast, ongoingEpisode.podcastTitle, ongoingEpisode.podcastRSS, ongoingEpisode.podcastImage);
		this.audio.play();
	}

	removeFromOngoing = (event, episode): void => {
		event.stopPropagation();
		this.toast.confirmModal().then((res) => {
			if (res.value) {
				this.ongoingService.removeFromOngoing(episode.guid);
				this.toast.toastSuccess('Removed from ongoing episodes');
			}
		});
	}

	getProgressPercentage = (episode): number => {
		return Math.round(episode.percentPlayed);
	}

	getProgressTime = (episode): string => {
		const currentMinutes = Math.floor(episode.currentTime / 60);
		const currentSeconds = Math.floor(episode.currentTime % 60);
		const totalMinutes = Math.floor(episode.duration / 60);
		const totalSeconds = Math.floor(episode.duration % 60);
		
		return `${currentMinutes}:${currentSeconds.toString().padStart(2, '0')} / ${totalMinutes}:${totalSeconds.toString().padStart(2, '0')}`;
	}
}
