import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { SocketService } from '../socket-service.service';

@Component({
  selector: 'app-viewer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './viewer.component.html',
  styleUrl: './viewer.component.css'
})
export class ViewerComponent implements OnInit{

  @ViewChild('remoteVideo') remoteVideo!: ElementRef;
  @ViewChild('status') statusElement!: ElementRef;
  @ViewChild('refreshButton') refreshButton!: ElementRef;
  @ViewChild('debugInfo') debugInfo!: ElementRef;
  peerConnection!:RTCPeerConnection;
  retryCount = 0;
  MAX_RETRIES = 5;
 constructor(private _socketService:SocketService) {
  this._socketService.on("broadcaster_connected").subscribe({
    next:(value)=>{
      this._socketService.requestBroadcast()
    }
  })
  this._socketService.on("broadcaster_disconnected").subscribe({
    next:(value)=>{
      this.closeConnection();
    }
  })
  this._socketService.on('viewer_offer').subscribe({
    next:(description)=>{
      this.setupPeerConnection(description);
    }
  })
  this._socketService.on('viewer_ice_candidate').subscribe({
    next:(candidate)=>{
      if (this.peerConnection) {
        this.peerConnection
          .addIceCandidate(new RTCIceCandidate(candidate))
          .catch((error) => {
            console.error("Error adding ICE candidate:", error);
          });
      }
    },
  })
 }
  ngOnInit(): void {
   
  }
   // Add debug logging 
   logDebug(message:string) {
    const timestamp = new Date().toLocaleTimeString();
    this.debugInfo.nativeElement.innerHTML += `<div>[${timestamp}] ${message}</div>`;
    this.debugInfo.nativeElement.scrollTop = this.debugInfo.nativeElement.scrollHeight;
    console.log(message);
  }
  setupPeerConnection(offer:RTCSessionDescriptionInit) {
    const configuration = {
      iceServers: [
        {
          urls: "stun:stun.relay.metered.ca:80",
        },
        {
          urls: "turn:global.relay.metered.ca:80",
          username: "f5baae95181d1a3b2947f791",
          credential: "n67tiC1skstIO4zc",
        },
        {
          urls: "turn:global.relay.metered.ca:80?transport=tcp",
          username: "f5baae95181d1a3b2947f791",
          credential: "n67tiC1skstIO4zc",
        },
        {
          urls: "turn:global.relay.metered.ca:443",
          username: "f5baae95181d1a3b2947f791",
          credential: "n67tiC1skstIO4zc",
        },
        {
          urls: "turns:global.relay.metered.ca:443?transport=tcp",
          username: "f5baae95181d1a3b2947f791",
          credential: "n67tiC1skstIO4zc",
        },
      ],
    };

    // Close any existing connection
    this.closeConnection();

    this.peerConnection = new RTCPeerConnection(configuration);

    // Handle incoming tracks
    this.peerConnection.ontrack = (event) => {

      if (!this.remoteVideo.nativeElement.srcObject) {
        this.remoteVideo.nativeElement.srcObject = new MediaStream();
      }

      // Add this track to the existing stream
      this.remoteVideo.nativeElement.srcObject.addTrack(event.track);
     

    };

    // ICE candidate handling
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this._socketService.viewerIceCandidate(event.candidate)
      }
    };

    // Connection state change
    this.peerConnection.onconnectionstatechange = (event) => {
    

      if (this.peerConnection.connectionState === "connected") {
      } else if (
        this.peerConnection.connectionState === "disconnected" ||
        this.peerConnection.connectionState === "failed"
      ) {

        // Auto retry for failed connections (with limit)
        if (
          this.peerConnection.connectionState === "failed" &&
          this.retryCount < this.MAX_RETRIES
        ) {
          this.retryCount++;
        
          setTimeout(this.requestBroadcast, 2000);
        }
      }
    };

    // ICE connection state change
    this.peerConnection.oniceconnectionstatechange = (event) => {
     
    };

    // Set remote description (offer from server)
    this.peerConnection
      .setRemoteDescription(offer)
      .then(() => {
        return this.peerConnection.createAnswer();
      })
      .then((answer) => {
        return this.peerConnection.setLocalDescription(answer);
      })
      .then(() => {
        this._socketService.viewerAnswer(this.peerConnection.localDescription)
      })
      .catch((error) => {
        console.error("Error setting up peer connection:", error);
      });
  }

  closeConnection() {
    if (this.peerConnection) {
      this.peerConnection.close();
    }

    if (this.remoteVideo.nativeElement.srcObject) {
      this.remoteVideo.nativeElement.srcObject.getTracks().forEach((track:MediaStreamTrack) => track.stop());
      this.remoteVideo.nativeElement.srcObject = null;
    }
  }
  refresh() {
    this.requestBroadcast()
  }
  requestBroadcast() {
   this._socketService.requestBroadcast()
  }
}


