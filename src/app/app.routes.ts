import { Routes } from '@angular/router';
import { BroadcasterComponent } from './broadcaster/broadcaster.component';
import { ViewerComponent } from './viewer/viewer.component';

export const routes: Routes = [
    {path:'broadcast',component:BroadcasterComponent},
    {path:'view',component:ViewerComponent}
];
