export type MediaTrackCapabilitiesMap = { [key: string]: MediaTrackCapabilities[] };

interface FocusDistance {
  min: number,
  max: number,
  step: number
}

async function getCameraWithClosestFocus(): Promise<string | undefined> {
  const capabilities = await getCapabilities();
  let minFocusDistance = Number.MAX_SAFE_INTEGER;
  let bestDeviceId: string | undefined;

  console.log(`capabilities: ${JSON.stringify(capabilities, null, 2)}`);
  Object.entries(capabilities).forEach(([id, values]) => {
    const focusDistance = getFocusDistance(values);
    console.log(`focusDistance: ${JSON.stringify(focusDistance, null, 2)} for device (${id})`);

    if (focusDistance && focusDistance.min < minFocusDistance) {
      minFocusDistance = focusDistance.min;
      bestDeviceId = id;
      console.log(`best focusDistance: ${JSON.stringify(focusDistance, null, 2)}: ${JSON.stringify(id)} ${JSON.stringify(values, null, 2)}`);
    }
  });

  return bestDeviceId;
}

async function getCameras(): Promise<MediaDeviceInfo[] | undefined> {
  if (!navigator.mediaDevices.enumerateDevices) {
    return undefined;
  }

  const devices = await navigator.mediaDevices.enumerateDevices();

  return devices.filter((x) => x.kind === "videoinput");
}

function getCapability<T>(value: MediaTrackCapabilities, key: string): T | undefined {
  if (key in value) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
    return (value as unknown as any)[key] as T | undefined;
  }

  return undefined;
}

function getCapabilities(value: string): Promise<MediaTrackCapabilities[] | undefined>;
function getCapabilities(value: MediaDeviceInfo): Promise<MediaTrackCapabilities[]>;
function getCapabilities(): Promise<MediaTrackCapabilitiesMap>;
async function getCapabilities(value: MediaDeviceInfo | string | undefined = undefined): Promise<MediaTrackCapabilitiesMap | MediaTrackCapabilities[] | undefined> {
  if (!value) {
    const devices = await getCameras();
    const resp: MediaTrackCapabilitiesMap = {};

    if (devices?.length) {
      for (const device of devices) {
        const capabilities = await getCapabilities(device);

        resp[device.deviceId] = capabilities;
      }
    }

    return resp;
  } else {
    // Single device
    const device = typeof value === "string" ? (await getCameras())?.find((x) => x.deviceId === value) : value;

    if (!device) {
      return undefined;
    }

    const media = await navigator.mediaDevices.getUserMedia({ video: device });
    const tracks = media.getTracks();
    const capabilities = tracks.map((track) => track.getCapabilities());

    tracks.forEach((track) => track.stop());

    return capabilities;
  }
}

function getFocusDistance(value: MediaTrackCapabilities[]): FocusDistance | undefined {
  return value
    .map((x) => {
      return getCapability<{ min: number, max: number, step: number }>(x, "focusDistance");
    })
    .find((x): x is FocusDistance => x !== undefined)
    ;
}

function getHasAutoFocus(value: MediaTrackCapabilities[]): boolean {
  return value.some((x) => {
    const focusMode = getCapability<string[]>(x, "focusMode");

    return focusMode?.includes("auto") || false;
  });
}

export {
  getCameraWithClosestFocus,
  getCameras,
  getCapabilities,
};
