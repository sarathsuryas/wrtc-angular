import { Component, ElementRef, ViewChild, viewChild } from '@angular/core';
import { SocketService } from '../socket-service.service';

@Component({
  selector: 'app-broadcaster',
  standalone: true,
  imports: [],
  templateUrl: './broadcaster.component.html',
  styleUrl: './broadcaster.component.css'
})
export class BroadcasterComponent {

   localStream:any ;
   peerConnection!:RTCPeerConnection;
   isBroadcasting = false;
   @ViewChild('localVideo') localVideo!: ElementRef;
   @ViewChild('start') start!:ElementRef
   @ViewChild('broadcast') broadcast!:ElementRef
   @ViewChild('status') status!:ElementRef
   @ViewChild('stop') stop!:ElementRef
  constructor(private _socketService:SocketService) {
    _socketService.on('broadcaster_answer').subscribe({
      next:(description)=>{
        this.peerConnection.setRemoteDescription(description)
        .catch(error => {
          console.error('Error setting remote description:', error);
        });
      }
    })
    _socketService.on('broadcaster_ice_candidate').subscribe({
      next:(candidate)=>{
        if (this.peerConnection) {
          this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
            .catch(error => {
              console.error('Error adding ICE candidate:', error);
            });
        }
      },
      error:(err)=>{
        console.error(err)
      }
    })
     
  }
 async startCamera() {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      });
      
      this.localVideo.nativeElement.srcObject = this.localStream;
      this.start.nativeElement.disabled = true;
      this.broadcast.nativeElement.disabled = false;
      
      this.updateStatus('Camera ready. Click "Start Broadcasting" to begin.', 'waiting');
    } catch (error) {
      console.error('Error accessing media devices:', error);
      this.updateStatus(`Error accessing camera/microphone: ${error}`, 'offline');
    }
  }
   updateStatus(message:string, className:string) {
    this.status.nativeElement.textContent = `Status: ${message}`;
    this.status.nativeElement.className = `status ${className}`;
  }
  broadcastVideo() {
    this._socketService.broadcaster()
    this.setupPeerConnection();
    this.broadcast.nativeElement.disabled = true;
    this.stop.nativeElement.disabled = false;
     this.isBroadcasting = true;
  }

  setupPeerConnection() {
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
    
    this.peerConnection = new RTCPeerConnection(configuration);
    
    // Add all tracks from local stream to the peer connection
    this.localStream.getTracks().forEach((track: MediaStreamTrack) => {
      this.peerConnection.addTrack(track, this.localStream);
    });
    
    // ICE candidate handling
    this.peerConnection.onicecandidate = (event:RTCPeerConnectionIceEvent) => {
      if (event.candidate) {
        this._socketService.broadcasterIceCandidate(event)
      }
    };
    
    // Create offer
    this.peerConnection.createOffer()
      .then((offer:RTCSessionDescriptionInit) => this.peerConnection.setLocalDescription(offer))
      .then(() => {
        // socket.emit('broadcaster_offer', this.peerConnection.localDescription);
        this._socketService.broadCastOffer(this.peerConnection.localDescription as RTCSessionDescription)
        this.updateStatus('Broadcasting started. Waiting for viewers...', 'online');
      })
      .catch(error => {
        console.error('Error creating offer:', error);
        this.updateStatus(`Error starting broadcast: ${error.message}`, 'offline');
      });
    }


    stopBroadcasting() {
      if (this.peerConnection) {
        this.peerConnection.close();
        // this.peerConnection = null;
      }
      
      this.isBroadcasting = false;
      this.broadcast.nativeElement.disabled = false;
      this.stop.nativeElement.disabled = true;
      this.updateStatus('Broadcasting stopped', 'offline');
    }

}
