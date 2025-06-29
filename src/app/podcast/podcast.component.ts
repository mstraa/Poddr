import { Component, OnInit, NgZone, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AudioService } from '../services/audio.service';
import { PodcastService } from '../services/podcast.service';
import { PlayedService } from '../services/played.service';
import { OngoingService } from '../services/ongoing.service';
import { ToastService } from '../services/toast.service';
import { Description } from '../pipes/description.pipe';
import { FavouritesService } from '../services/favourites.service';
import { OfflineService } from '../services/offline.service';
import { WaitlistService } from '../services/waitlist.service';
import { clipboard, shell } from 'electron';
import { faHeart, faCircle, faEnvelope, faCopy } from '@fortawesome/free-regular-svg-icons';
import {
	faSortAmountDown,
	faSortAmountUp,
	faInfoCircle,
	faCheckCircle,
	faDownload,
	faGlobeEurope,
	faRss,
	faEllipsisV,
	faTimes,
	faMusic,
	faExternalLinkAlt,
	faPlus
} from '@fortawesome/free-solid-svg-icons';
import parsePodcast from 'node-podcast-parser';
import * as log from 'electron-log';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-podcast',
    templateUrl: './podcast.component.html',
    styleUrls: ['./podcast.component.css'],
    providers: [Description],
    standalone: false
})
export class PodcastComponent implements OnInit, OnDestroy {
	private routeSubscription: Subscription;
	private prevPlayedSubscription: Subscription;
	private ongoingSubscription: Subscription;
	private offlineSubscription: Subscription;
	private favSubscription: Subscription;
	private audioPlayingSubscription: Subscription;
	private audioGuidSubscription: Subscription;
	private podcastRssFeedSubscription: Subscription;
	private podcastFeedSubscription: Subscription;

	private id: string;
	private regPattern: RegExp = /^[0-9]+$/;

	public faHeart = faHeart;
	public faCircle = faCircle;
	public faEnvelope = faEnvelope;
	public faSortUp = faSortAmountUp;
	public faSortDown = faSortAmountDown;
	public faInfoCircle = faInfoCircle;
	public faCheckCircle = faCheckCircle;
	public faDownload = faDownload;
	public faGlobeEurope = faGlobeEurope;
	public faRss = faRss;
	public faEllipsisV = faEllipsisV;
	public faTimes = faTimes;
	public faMusic = faMusic;
	public faExternalLinkAlt = faExternalLinkAlt;
	public faCopy = faCopy;
	public faPlus = faPlus;

	public currentGUID: string = "";
	public isPlaying: Boolean = false;
	public isLoading: Boolean = true;
	public isError: Boolean = false;
	public rss: string = '';
	public title: string = '';
	public author: string = '';
	public description: string = '';
	public image: string = '';
	public updated: string = '';
	public website: string = '';
	public email: string = '';
	public episodes: any[] = [];
	public allEpisodes: any[] = [];
	public sortBy: string = "asc";
	public latestEpisode: any = {};
	public playedEpisodes: string[] = [];
	public ongoingEpisodes: any = {};
	public offlineEpisodes: string[] = [];
	public query: string = "";
	public favs: string[] = [];

	constructor(private route: ActivatedRoute,
		private audio: AudioService,
		private prevPlayed: PlayedService,
		private ongoing: OngoingService,
		private podcastService: PodcastService,
		private toast: ToastService,
		private favouriteService: FavouritesService,
		private offlineService: OfflineService,
		private waitlistService: WaitlistService,
		private descriptionPipe: Description,
		private zone: NgZone) { }

	ngOnInit() {
		//Listen for changes in URL parameters
		this.routeSubscription = this.route.paramMap.subscribe(params => {
			this.id = params.get("id");
			if (this.regPattern.test(this.id)) {
				this.getRSS(this.id);
			} else {
				this.parseRSS(this.id);
			}
		})

		this.prevPlayedSubscription = this.prevPlayed.playedEpisodes.subscribe(value => {
			this.zone.run(() => {
				this.playedEpisodes = value;
			});
		});
		this.ongoingSubscription = this.ongoing.ongoingEpisodes.subscribe(value => {
			this.zone.run(() => {
				this.ongoingEpisodes = value;
			});
		});
		this.offlineSubscription = this.offlineService.offlineKeys.subscribe(value => {
			this.zone.run(() => {
				this.offlineEpisodes = value;
			});
		});
		this.favSubscription = this.favouriteService.favouriteTitles.subscribe(value => {
			this.zone.run(() => {
				this.favs = value;
			});
		});

		this.audioPlayingSubscription = this.audio.playing.subscribe(value => { this.isPlaying = value });
		this.audioGuidSubscription = this.audio.guid.subscribe(value => { this.currentGUID = value });
	}

	ngOnDestroy() {
		if (this.routeSubscription) this.routeSubscription.unsubscribe();
		if (this.prevPlayedSubscription) this.prevPlayedSubscription.unsubscribe();
		if (this.ongoingSubscription) this.ongoingSubscription.unsubscribe();
		if (this.offlineSubscription) this.offlineSubscription.unsubscribe();
		if (this.favSubscription) this.favSubscription.unsubscribe();
		if (this.audioPlayingSubscription) this.audioPlayingSubscription.unsubscribe();
		if (this.audioGuidSubscription) this.audioGuidSubscription.unsubscribe();
		if (this.podcastRssFeedSubscription) this.podcastRssFeedSubscription.unsubscribe();
		if (this.podcastFeedSubscription) this.podcastFeedSubscription.unsubscribe();
	}

	//Extra step needed if we only have the iTunes ID
	private getRSS = (id: string): void => {
		this.podcastRssFeedSubscription = this.podcastService.getRssFeed(id).subscribe((data) => {
			this.parseRSS(data['results'][0]['feedUrl']);
		}, (error) => {
			log.error('Podcast component :: ' + error);
			this.isLoading = false;
			this.isError = true;
			this.title = "An error occured";
			this.toast.errorModal(error);
		});
	}

	private parseRSS = (rss: string): void => {
		this.rss = rss;
		this.podcastFeedSubscription = this.podcastService.getPodcastFeed(rss).subscribe((response) => {
			parsePodcast(response, (error, data) => {
				if (error) {
					log.error('Podcast component :: Parsing RSS feed failed for ' + rss);
					log.error(error);
					this.isLoading = false;
					this.isError = true;
					this.title = "An error occured";
					this.toast.errorModal("Parsing of " + rss + " failed");
				} else {
					this.title = data.title;
					this.author = data.author;
					this.description = data.description.long;
					this.image = data.image;
					this.updated = data.updated;
					this.website = data.link;
					this.email = data.owner.email;
					this.episodes = data.episodes;
					this.allEpisodes = this.episodes.map(x => Object.assign({}, x));
					this.latestEpisode = this.episodes[0];
					this.isLoading = false;
				}
			});
		}, (error) => {
			log.error('Podcast component :: ' + error);
			this.isLoading = false;
			this.isError = true;
			this.title = "An error occured";
			this.toast.errorModal(error);
		});
	}

	play = (podcastObject: any): void => {
		let podcast = {
			src: podcastObject.enclosure.url,
			episodeTitle: podcastObject.title,
			description: podcastObject.description,
			guid: podcastObject.guid,
			cover: podcastObject.image
		};
		this.audio.loadAudio(podcast, this.title, this.rss, this.image);
		this.audio.play();
	}

	download = (event, podcastObject: any): void => {
		event.stopPropagation();
		this.offlineService.download(this.title, this.rss, podcastObject);
	}

	removeDownload = (event, podcastObject: any): void => {
		event.stopPropagation();
		this.offlineService.remove(podcastObject.guid);
	}

	filter = (): void => {
		log.info("Podcast component :: Filtering based on: " + this.query);
		this.episodes = this.allEpisodes.filter(e => e.description.toLowerCase().includes(this.query.toLowerCase()) || e.title.toLowerCase().includes(this.query.toLowerCase()));
	}

	toggleOrder = (): void => {
		log.info("Podcast component :: Toggle " + this.sortBy);
		if (this.sortBy == "asc") {
			this.episodes.sort((x, y) => x.published - y.published);
			this.sortBy = "desc";
		} else {
			this.episodes.sort((x, y) => y.published - x.published);
			this.sortBy = "asc";
		}
	}

	openURL = (url: string): void => {
		shell.openExternal(url);
	}

	copyToClipboard = (text: string): void => {
		clipboard.writeText(text);
		this.toast.toast('Copied email to clipboard!');
	}

	showDescription = (event, title, description): void => {
		event.stopPropagation();
		this.toast.modal(title, this.descriptionPipe.transform(description));
	}

	addFavourite = (): void => {
		this.favouriteService.addFavourite(this.rss);
	}

	markAsPlayed = (guid): void => {
		this.prevPlayed.markAsPlayed(guid);
	}

	unmarkAsPlayed = (guid): void => {
		this.prevPlayed.unmarkAsPlayed(guid);
	}

	addToWaitlist = (episode): void => {
		this.waitlistService.addToWaitlist(episode, this.title, this.rss, this.image);
	}

	// Ongoing episode methods
	isOngoing = (guid: string): boolean => {
		return this.ongoingEpisodes[guid] !== undefined;
	}

	getOngoingProgress = (guid: string): number => {
		const episode = this.ongoingEpisodes[guid];
		return episode ? episode.percentPlayed : 0;
	}

	resumeEpisode = (episode: any): void => {
		const ongoingEpisode = this.ongoingEpisodes[episode.guid];
		if (ongoingEpisode) {
			this.play(episode);
			// Position will be restored automatically by the audio service
		}
	}

	removeFromOngoing = (guid: string): void => {
		this.ongoing.removeFromOngoing(guid);
	}

	getResumeTimeText = (guid: string): string => {
		const episode = this.ongoingEpisodes[guid];
		if (episode && episode.currentTime > 0) {
			const minutes = Math.floor(episode.currentTime / 60);
			const seconds = Math.floor(episode.currentTime % 60);
			return `Resume from ${minutes}:${seconds.toString().padStart(2, '0')}`;
		}
		return 'Resume';
	}
}
