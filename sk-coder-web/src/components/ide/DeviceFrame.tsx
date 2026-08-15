import { useIDEStore } from "@/store/ideStore"
import { Smartphone, Monitor, Tablet, Settings } from "lucide-react"

type Device = "mobile" | "tablet" | "desktop"

const DEVICES: Record<Device, { width: number; height: number; name: string }> = {
  mobile: { width: 375, height: 812, name: "iPhone 12" },
  tablet: { width: 768, height: 1024, name: "iPad" },
  desktop: { width: 1200, height: 800, name: "Desktop" },
}

export default function DeviceFrame() {
  const { settings, updateSettings } = useIDEStore()
  const device = (settings.preview.viewport || "mobile") as Device
  const deviceSize = DEVICES[device]

  function toggleDevice(d: Device) {
    updateSettings({
      ...settings,
      preview: { ...settings.preview, viewport: d },
    })
  }

  return (
    <div className="device-frame-container">
      <div className="device-toolbar">
        <div className="device-buttons">
          {Object.keys(DEVICES).map((d) => (
            <button
              key={d}
              onClick={() => toggleDevice(d as Device)}
              className={`btn-device ${device === d ? "active" : ""}`}
              title={DEVICES[d as Device].name}
            >
              {d === "mobile" && <Smartphone size={16} />}
              {d === "tablet" && <Tablet size={16} />}
              {d === "desktop" && <Monitor size={16} />}
              <span>{DEVICES[d as Device].name}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="device-wrapper" style={{
        maxWidth: device === "mobile" ? "400px" : device === "tablet" ? "820px" : "100%",
        aspectRatio: `${deviceSize.width} / ${deviceSize.height}`,
      }}>
        {device === "mobile" && (
          <div className="device-mobile">
            <div className="device-notch" />
            <div className="device-content">
              <div id="preview-container" className="preview-content" />
            </div>
            <div className="device-home" />
          </div>
        )}

        {device === "tablet" && (
          <div className="device-tablet">
            <div className="device-content">
              <div id="preview-container" className="preview-content" />
            </div>
          </div>
        )}

        {device === "desktop" && (
          <div className="device-desktop">
            <div className="device-chrome">
              <div className="chrome-buttons">
                <span className="chrome-btn" />
                <span className="chrome-btn" />
                <span className="chrome-btn" />
              </div>
              <div className="chrome-url">Preview Pane</div>
            </div>
            <div className="device-content">
              <div id="preview-container" className="preview-content" />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
