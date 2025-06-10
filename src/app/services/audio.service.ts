import { Injectable, Injector } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ToastService } from './toast.service';
import { PlayedService } from './played.service';
import { OngoingService } from './ongoing.service';
import * as log from 'electron-log';
import Store from 'electron-store';

const ipc = require('electron').ipcRenderer;

@Injectable({
	providedIn: 'root'
})
export class AudioService {
	private store = new Store();
	private audio: HTMLAudioElement = new Audio();
	
	public guid: BehaviorSubject<string> = new BehaviorSubject("");
	public rss: BehaviorSubject<string> = new BehaviorSubject("");
	public loading: BehaviorSubject<boolean> = new BehaviorSubject(false);
	public playing: BehaviorSubject<boolean> = new BehaviorSubject(false);
	public muted: BehaviorSubject<boolean> = new BehaviorSubject(false);
	public podcast: BehaviorSubject<string> = new BehaviorSubject("No title");
	public episode: BehaviorSubject<string> = new BehaviorSubject("No title");
	public description: BehaviorSubject<string> = new BehaviorSubject("No description");
	public podcastCover: BehaviorSubject<string> = new BehaviorSubject("");
	public episodeCover: BehaviorSubject<string> = new BehaviorSubject("");
	public time: BehaviorSubject<number> = new BehaviorSubject(0);
	public duration: BehaviorSubject<number> = new BehaviorSubject(0);
	public percentPlayed: BehaviorSubject<number> = new BehaviorSubject(0);
	public volume: BehaviorSubject<number> = new BehaviorSubject(0);
	public playbackRate: BehaviorSubject<number> = new BehaviorSubject(1.0);

	// For ongoing episode tracking
	private lastProgressSave: number = 0;
	private progressSaveInterval: number = 5000; // Save progress every 5 seconds

	constructor(private toast: ToastService, private played: PlayedService, private ongoing: OngoingService, private injector: Injector) {
		this.initIpcListeners();
		this.initAudio();
		this.initAudioListeners();
		log.info("Audio service :: Initialized audio service.");
	}

	private initIpcListeners(): void {
		log.info("Audio service :: Initializing IPC listeners.");
		ipc.on("player:toggle-play", () => { this.togglePlay() });
		ipc.on("app:close", () => {
			this.store.set("volume", this.audio.volume);
			this.store.set("time", this.audio.currentTime);
			this.store.set("playbackRate", this.audio.playbackRate);
			ipc.send("app:closed");
		});
	}

	private initAudio(): void {
		log.info("Audio service :: Initializing Audio.");

		//Load stored volume
		this.audio.volume = this.store.get("volume", 0.5) as number;
		this.volume.next(this.audio.volume);

		//Load stored time
		this.audio.currentTime = this.store.get("time", 0) as number;

		//Load stored playbackRate
		this.setPlaybackRate(this.store.get("playbackRate", 1.0) as number);
		this.playbackRate.next(this.audio.playbackRate);

		//Load stored playerstate
		let playerState: any = this.store.get("playerState");
		if (playerState) {
			this.audio.src = playerState.podcastURL;
			this.guid.next(playerState.podcastGUID);
			this.rss.next(playerState.podcastRSS);
			this.podcast.next(playerState.podcastTitle);
			this.episode.next(playerState.podcastEpisodeTitle);
			this.podcastCover.next(playerState.podcastCover);
			this.episodeCover.next(playerState.episodeCover);
			this.description.next(playerState.podcastDescription);
		}

		this.updateMedia();
	}

	private initAudioListeners(): void {
		log.info("Audio service :: Initializing Event listeners.");
		this.audio.addEventListener('play', this.onPlay);
		this.audio.addEventListener('pause', this.onPause);
		this.audio.addEventListener('loadstart', this.onLoadStart);
		this.audio.addEventListener('timeupdate', this.onTimeUpdate);
		this.audio.addEventListener('volumechange', this.onVolumeChange);
		this.audio.addEventListener('ratechange', this.onPlaybackRateChange);
		this.audio.addEventListener('seeking', this.onSeeking);
		this.audio.addEventListener('waiting', this.onWaiting);
		this.audio.addEventListener('canplaythrough', this.onCanPlayThrough);
		this.audio.addEventListener('ended', this.onEnded);
		this.audio.addEventListener('error', this.onError);
	}

	private onPlay = () => {
		log.info("Audio service :: Playing.");
		this.playing.next(true);
		ipc.send("media-play");
	}

	private onPause = () => {
		log.info("Audio service :: Paused.");
		this.playing.next(false);
		ipc.send("media-pause");
	}

	private onLoadStart = () => {
		log.info("Audio service :: Started loading.");
		this.loading.next(true);
	}

	private onTimeUpdate = () => {
		const currentPercent = (this.audio.currentTime / this.audio.duration) * 100 || 0;
		this.percentPlayed.next(currentPercent);
		this.time.next(this.audio.currentTime);
		
		// Check if episode should be marked as ongoing (10% threshold)
		this.checkOngoingThreshold(currentPercent);
		
		// Save progress periodically for ongoing episodes
		this.saveProgressIfNeeded();
	}

	private onVolumeChange = () => {
		this.volume.next(this.audio.volume);
		this.muted.next(this.audio.volume === 0 || this.audio.muted);
	}

	private onPlaybackRateChange = () => {
		log.info("Audio service :: PlaybackRate changed to " + this.audio.playbackRate);
		this.playbackRate.next(this.audio.playbackRate);
	}

	private onSeeking = () => {
		log.info("Audio service :: Seeking.");
		this.loading.next(true);
	}

	private onWaiting = () => {
		log.info("Audio service :: Waiting for more data.");
		this.loading.next(true);
	}

	private onCanPlayThrough = () => {
		log.info("Audio service :: Can play through.");
		this.loading.next(false);
		this.duration.next(this.audio.duration);
	}

	private onEnded = () => {
		log.info("Audio service :: Podcast ended.");
		
		// Remove from ongoing before marking as played
		this.ongoing.removeFromOngoing(this.guid.value);
		this.played.markAsPlayed(this.guid.value);
		
		// Try to play next episode from waitlist
		this.playNextInWaitlist();
	}

	private onError = (error) => {
		log.error('Audio service :: Error => ' + error.target.error.code + ' :: ' + error.target.error.message);
		log.error('Audio service :: Audio source => ' + this.audio.src);

		switch (error.target.error.code) {
			case error.target.error.MEDIA_ERR_ABORTED:
				this.toast.toastError('You aborted the playback.');
				break;
			case error.target.error.MEDIA_ERR_NETWORK:
				this.toast.toastError('A network error caused the audio download to fail.');
				break;
			case error.target.error.MEDIA_ERR_DECODE:
				this.toast.toastError('The audio playback was aborted due to an error when decoding media.');
				break;
			case error.target.error.MEDIA_ERR_SRC_NOT_SUPPORTED:
				this.toast.toastError('The audio could not be loaded, either because the server or network failed or because the format is not supported.');
				break;
			default:
				this.toast.toastError('Something went wrong, try again.');
				break;
		}

		this.loading.next(false);
	}

	private updateMedia = () => {
		ipc.send("media-update", {
			image: this.episodeCover.value,
			title: this.episode.value,
			artist: this.podcast.value
		});
	}

	// public methods
	loadAudio(podcast, pTitle, pRSS, pCover): void {
		this.audio.src = podcast.src;
		this.guid.next(podcast.guid);
		this.rss.next(pRSS);
		this.podcast.next(pTitle);
		this.episode.next(podcast.episodeTitle);
		this.description.next(podcast.description);
		this.duration.next(0);
		this.time.next(0);

		this.podcastCover.next(pCover);
		if (podcast.cover) {
			this.episodeCover.next(podcast.cover);
		} else {
			this.episodeCover.next(pCover);
		}

		this.store.set("playerState", {
			podcastURL: this.audio.src,
			podcastTitle: this.podcast.value,
			podcastEpisodeTitle: this.episode.value,
			podcastCover: this.podcastCover.value,
			episodeCover: this.episodeCover.value,
			podcastRSS: this.rss.value,
			podcastDescription: this.description.value,
			podcastGUID: this.guid.value
		});

		// Check if this episode has saved progress and restore it
		this.restoreOngoingPosition(podcast.guid);

		this.updateMedia();
	}

	play(): void {
		this.audio.play();
	}

	pause(): void {
		this.audio.pause();
	}

	togglePlay(): void {
		this.audio.paused ? this.audio.play() : this.audio.pause();
	}

	setTime(time: number): void {
		this.audio.currentTime = time;
	}

	changeTime(amount: number): void {
		this.audio.currentTime += amount;
	}

	getDuration(): number {
		return this.audio.duration;
	}

	setVolume(volume: number): void {
		this.audio.volume = volume;
	}

	changeVolume(diff: number): void {
		if (this.audio.volume + diff > 1) {
			this.audio.volume = 1;
		} else if (this.audio.volume + diff < 0) {
			this.audio.volume = 0;
		} else {
			this.audio.volume += diff;
		}
	}

	setPlaybackRate(rate: number): void {
		if (rate >= 0.25 && rate <= 2.00) {
			this.audio.playbackRate = rate;
			this.audio.defaultPlaybackRate = rate;
		}
	}

	getRSS(): string {
		return this.rss.value;
	}

	getAudio(): HTMLAudioElement {
		return this.audio;
	}

	playNextInWaitlist(): void {
		// Use async import to avoid circular dependency
		import('./waitlist.service').then((module) => {
			const waitlistServiceInstance = this.injector.get(module.WaitlistService);
			const nextEpisode = waitlistServiceInstance.getNextEpisode();
			
			if (nextEpisode) {
				log.info("Audio service :: Playing next episode from waitlist: " + nextEpisode.title);
				
				const podcast = {
					src: nextEpisode.src,
					episodeTitle: nextEpisode.title,
					description: nextEpisode.description,
					guid: nextEpisode.guid,
					cover: nextEpisode.image
				};
				
				this.loadAudio(podcast, nextEpisode.podcastTitle, nextEpisode.podcastRSS, nextEpisode.podcastImage);
				this.play();
				
				// Remove the played episode from waitlist
				waitlistServiceInstance.removeFirstEpisode();
				this.toast.toast("Playing next from waitlist: " + nextEpisode.title);
			} else {
				this.toast.toast("Podcast ended - Waitlist is empty");
			}
		}).catch((error) => {
			log.error("Audio service :: Error playing next from waitlist: " + error);
			this.toast.toast("Podcast ended");
		});
	}

	// Ongoing episode tracking methods
	private checkOngoingThreshold(percentPlayed: number): void {
		const currentGuid = this.guid.value;
		
		// Skip if already marked as played or if no guid
		if (!currentGuid || this.played.playedEpisodes.value.includes(currentGuid)) {
			return;
		}

		// Mark as ongoing if 10% threshold is reached and not already marked
		if (percentPlayed >= 10 && !this.ongoing.isOngoing(currentGuid)) {
			const episodeData = {
				guid: currentGuid,
				title: this.episode.value,
				description: this.description.value,
				src: this.audio.src,
				duration: this.audio.duration,
				currentTime: this.audio.currentTime,
				percentPlayed: percentPlayed,
				podcastTitle: this.podcast.value,
				podcastRSS: this.rss.value,
				podcastImage: this.podcastCover.value,
				episodeImage: this.episodeCover.value
			};
			
			this.ongoing.markAsOngoing(episodeData);
			log.info("Audio service :: Episode marked as ongoing: " + currentGuid);
		}
	}

	private saveProgressIfNeeded(): void {
		const currentTime = Date.now();
		const currentGuid = this.guid.value;
		
		// Save progress every 5 seconds for ongoing episodes
		if (currentGuid && 
			this.ongoing.isOngoing(currentGuid) && 
			currentTime - this.lastProgressSave > this.progressSaveInterval) {
			
			this.ongoing.updateProgress(
				currentGuid,
				this.audio.currentTime,
				this.percentPlayed.value
			);
			
			this.lastProgressSave = currentTime;
		}
	}

	private restoreOngoingPosition(guid: string): void {
		const ongoingEpisode = this.ongoing.getOngoingEpisode(guid);
		
		if (ongoingEpisode && ongoingEpisode.currentTime > 0) {
			// Wait for the audio to be loaded before setting the time
			const restorePosition = () => {
				if (this.audio.duration > 0) {
					this.audio.currentTime = ongoingEpisode.currentTime;
					log.info(`Audio service :: Restored position for ongoing episode: ${guid} at ${ongoingEpisode.currentTime}s`);
					this.toast.toast(`Resuming from ${Math.floor(ongoingEpisode.currentTime / 60)}:${(Math.floor(ongoingEpisode.currentTime % 60)).toString().padStart(2, '0')}`);
				} else {
					// If duration not ready, try again after a short delay
					setTimeout(restorePosition, 100);
				}
			};
			
			restorePosition();
		}
	}

	// Public method to resume ongoing episode from specific position
	resumeFromPosition(guid: string): void {
		const ongoingEpisode = this.ongoing.getOngoingEpisode(guid);
		if (ongoingEpisode) {
			this.restoreOngoingPosition(guid);
		}
	}
}
