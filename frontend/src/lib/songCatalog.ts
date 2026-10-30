import type { SongCatalogItem, TranscriptionResponse } from '../types'
import tuHaiKahanData from '../preanalyzed/tu_hai_kahan.json'
import breathlessData from '../preanalyzed/breathless.json'
import manasuData from '../preanalyzed/manasu.json'
import letItBeData from '../preanalyzed/let_it_be.json'
import perfectData from '../preanalyzed/perfect.json'
import naatuNaatuData from '../preanalyzed/naatu_naatu.json'
import sampleSongData from '../preanalyzed/sample_song.json'

export const SAMPLE_SONG_LYRICS = `In the silence of the night echoes of memories whispers of your laughter now just echoes in my home promises we made`

export const SAMPLE_SONG_PREANALYZED = sampleSongData as unknown as TranscriptionResponse

export const TU_HAI_KAHAN_LYRICS = `Socha na tha zindagi mein aisa bhi daur aayega
Rona bhi zaroori hoga aur aansu bhi chupana padega
Tu hai kahan khwaabon ke jahan
Tere bina dil lagta nahi
Yaadon mein teri beete din raat
Aankhon mein tera chehra bas gaya
Laut aao ab to sanam
Tere bina ab jeena mushkil hai`

export const BREATHLESS_LYRICS = `Koi jo mila to mujhe aisa lagta tha jaise meri saari duniya mein geeton ki rut aur rangon ki barkha hai khushbu ki aandhi hai
Mehki hui si ab saari fazaayein hain
Behki hui si ab saari hawaayein hain
Khoi hui si ab saari dishaayein hain
Badli hui si ab saari adaayein hain
Jaagi umangein hain dhadak raha hai dil
Saanson mein toofaan hai hothon pe nagma hai
Aankhon mein sapne hain sapnon mein beete hue saare vo lamhe hain`

export const MANASU_MAREE_LYRICS = `Manasu maree mathi poyi thadabaaduthunnadi
Ninne thalachi thalachi naluputhunnadi
Kopam unna konchem prema kooda daachukunnadi
Chithramainaa ee vithanam naalone molisaaka
Nee jaada kosam vethiki vethiki
Tholi saari kothagaa alavaatu aindhe
Ninu choosi choosi kallu merisene`

export const LET_IT_BE_LYRICS = `When I find myself in times of trouble Mother Mary comes to me
Speaking words of wisdom let it be
And in my hour of darkness she is standing right in front of me
Speaking words of wisdom let it be
Let it be let it be let it be let it be
Whisper words of wisdom let it be`

export const PERFECT_LYRICS = `I found a love for me
Darling just dive right in and follow my lead
Well I found a girl beautiful and sweet
Oh I never knew you were the someone waiting for me
'Cause we were just kids when we fell in love
Not knowing what it was
I will not give you up this time
But darling just kiss me slow your heart is all I own
And in your eyes you're holding mine
Baby I'm dancing in the dark with you between my arms
Barefoot on the grass listening to our favourite song
When you said you looked a mess I whispered underneath my breath
But you heard it darling you look perfect tonight`

export const NAATU_NAATU_LYRICS = `Polam gattu dummulona potlethe ettugatti
Chengaavi rangu cheera katti thalukumannadha
Pachani pasupu poosi thalambaraala gummam tholi
Kallaku gajjelu katti chindulesi aadaali
Naatu Naatu Naatu Naatu Naatu Naatu Veera Naatu
Naatu Naatu Naatu Naatu Naatu Naatu Oora Naatu
Gundela adiripoyela dhummu lepi aadaali
Erra tholu mirchi laanti pilla choopu thaakagaane
Gundello ganta mrogi keka petti aadaali`

export const CATALOG_SONGS: SongCatalogItem[] = [
  {
    id: 'rec_1',
    title: 'Tu Hai Kahan',
    artist: 'AUR',
    language: 'Hindi',
    genre: 'Acoustic Pop',
    duration: '04:23',
    isRecommended: true,
    coverColor: '#2D170C',
    demoAudioUrl: '/demo/Tu%20Hai%20Kahan%20by%20AUR%20%20%D8%AA%D9%88%20%DB%81%DB%92%20%DA%A9%DB%81%D8%A7%DA%BA%20(Official%20Music%20Video).mp3',
    demoLyrics: TU_HAI_KAHAN_LYRICS,
    preAnalyzedData: tuHaiKahanData as unknown as TranscriptionResponse,
  },
  {
    id: 'rec_2',
    title: 'Breathless',
    artist: 'Shankar Mahadevan',
    language: 'Hindi',
    genre: 'Classical Fusion',
    duration: '02:54',
    isRecommended: true,
    coverColor: '#391E10',
    demoAudioUrl: '/demo/Breathless%20(Official%20Music%20Video)%20%20Shankar%20Mahadevan%20%20Javed%20Akhtar.mp3',
    demoLyrics: BREATHLESS_LYRICS,
    preAnalyzedData: breathlessData as unknown as TranscriptionResponse,
  },
  {
    id: 'rec_3',
    title: 'Manasu',
    artist: 'Amit Trivedi (V)',
    language: 'Telugu / Kannada',
    genre: 'Melody',
    duration: '04:27',
    isRecommended: true,
    coverColor: '#422313',
    demoAudioUrl: '/demo/Manasu%20Maree%20Full%20video%20Song%20%20V%20Songs%20%20Nani,%20Aditi%20Rao%20Hydari%20%20Amit%20Trivedi.mp3',
    demoLyrics: MANASU_MAREE_LYRICS,
    preAnalyzedData: manasuData as unknown as TranscriptionResponse,
  },
  {
    id: 'top_1',
    title: 'Let It Be (Studio Demo)',
    artist: 'The Beatles',
    language: 'English',
    genre: 'Classic Rock',
    duration: '04:03',
    isTopPractice: true,
    coverColor: '#1F110A',
    demoAudioUrl: '/demo/Let%20It%20Be%20(Remastered%202009).mp3',
    demoLyrics: LET_IT_BE_LYRICS,
    preAnalyzedData: letItBeData as unknown as TranscriptionResponse,
  },
  {
    id: 'top_2',
    title: 'Perfect',
    artist: 'Ed Sheeran',
    language: 'English',
    genre: 'Acoustic Ballad',
    duration: '04:41',
    isTopPractice: true,
    coverColor: '#261309',
    demoAudioUrl: '/demo/Ed%20Sheeran%20-%20Perfect%20(Official%20Music%20Video).mp3',
    demoLyrics: PERFECT_LYRICS,
    preAnalyzedData: perfectData as unknown as TranscriptionResponse,
  },
  {
    id: 'top_3',
    title: 'Naatu Naatu',
    artist: 'RRR',
    language: 'Telugu / Hindi',
    genre: 'High Energy Folk',
    duration: '04:34',
    isTopPractice: true,
    coverColor: '#4A2817',
    demoAudioUrl: '/demo/Naatu%20Naatu%20%5B8K%5D%20Video%20Song%20%20RRR%20%20NTR,Ram%20Charan%20%20MM%20Keeravaani%20%20SS%20Rajamouli.mp3',
    demoLyrics: NAATU_NAATU_LYRICS,
    preAnalyzedData: naatuNaatuData as unknown as TranscriptionResponse,
  },
]
