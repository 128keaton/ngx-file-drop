import { Component } from '@angular/core';
import { UploadFile, UploadEvent } from 'ngx-file-drop/lib/ngx-drop';

@Component({
  selector: 'demo-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {

  public files: UploadFile[] = [];

  public dropped(event: UploadEvent) {  
    this.files = event.files;
    console.log(this.files);
  }
}
