// Angular modules
import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { NgSelectModule } from '@ng-select/ng-select';
import { FormsModule } from '@angular/forms';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { DragDropModule } from '@angular/cdk/drag-drop';

// Pipes
import { ItunesImage } from './pipes/itunes-image.pipe';
import { Description } from './pipes/description.pipe';
import { SecondsToHhMmSs } from './pipes/secondsToHhMmSs.pipe';

// Routing & Components
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { TitlebarComponent } from './titlebar/titlebar.component';
import { SidenavComponent } from './sidenav/sidenav.component';
import { PlayerComponent } from './player/player.component';
import { ToplistsComponent } from './toplists/toplists.component';
import { FavouritesComponent } from './favourites/favourites.component';
import { SearchComponent } from './search/search.component';
import { SettingsComponent } from './settings/settings.component';
import { PodcastComponent } from './podcast/podcast.component';
import { WaitlistComponent } from './waitlist/waitlist.component';

@NgModule({ declarations: [
        AppComponent,
        ItunesImage,
        Description,
        SecondsToHhMmSs,
        TitlebarComponent,
        SidenavComponent,
        PlayerComponent,
        ToplistsComponent,
        FavouritesComponent,
        SearchComponent,
        SettingsComponent,
        PodcastComponent,
        WaitlistComponent
    ],
    bootstrap: [AppComponent], imports: [BrowserModule,
        FormsModule,
        NgSelectModule,
        AppRoutingModule,
        FontAwesomeModule,
        DragDropModule], providers: [provideHttpClient(withInterceptorsFromDi())] })
export class AppModule { }
