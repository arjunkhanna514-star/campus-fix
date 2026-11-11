// Picking a photo and attaching it to an upload. Used by the report form
// (the student's photo of the problem) and by the admin (the photo of the fix).

import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

export type Photo = { uri: string; name: string; type: string; file?: File };

export type PickResult = { photo: Photo } | { error: string } | null;

// Returns the chosen photo, an error message to show, or null if the user cancelled.
export async function pickPhoto(source: 'camera' | 'library'): Promise<PickResult> {
  try {
    if (source === 'camera') {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) return { error: 'Camera access is off. Allow it in your phone settings, or choose a photo instead.' };
    }
    const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.6 };
    const result = source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
    if (result.canceled || !result.assets?.length) return null;
    const asset = result.assets[0];
    return { photo: { uri: asset.uri, name: asset.fileName || 'photo.jpg', type: asset.mimeType || 'image/jpeg', file: asset.file } };
  } catch {
    return { error: 'Could not open the photo. Try again, or continue without one.' };
  }
}

// Phones and browsers attach files differently.
export async function appendPhoto(form: FormData, photo: Photo) {
  if (Platform.OS === 'web') {
    const blob = photo.file ?? (await (await fetch(photo.uri)).blob());
    form.append('photo', blob, photo.name);
  } else {
    // React Native reads the file straight from its location on the phone.
    form.append('photo', { uri: photo.uri, name: photo.name, type: photo.type } as unknown as Blob);
  }
}
