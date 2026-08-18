import Foundation
import UIKit
import Capacitor
import Network
import ImageIO

@objc(KemetAirPrintPlugin)
public class KemetAirPrintPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "KemetAirPrintPlugin"
    public let jsName = "KemetAirPrint"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "print", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "printRaster", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "testConnection", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "openCashDrawer", returnType: CAPPluginReturnPromise),
    ]

    @objc func print(_ call: CAPPluginCall) {
        guard let html = call.getString("html"), !html.isEmpty else {
            call.reject("html is required")
            return
        }
        let jobName = String((call.getString("jobName") ?? "K-Waiter Receipt").prefix(120))
        DispatchQueue.main.async {
            let controller = UIPrintInteractionController.shared
            let info = UIPrintInfo(dictionary: nil)
            info.outputType = .general
            info.jobName = jobName
            controller.printInfo = info
            controller.printFormatter = UIMarkupTextPrintFormatter(markupText: html)
            controller.present(animated: true) { _, completed, error in
                if let error = error {
                    call.reject("AirPrint failed", "AIRPRINT_FAILED", error)
                } else {
                    call.resolve(["completed": completed])
                }
            }
        }
    }

    @objc func testConnection(_ call: CAPPluginCall) {
        guard let endpoint = validatedEndpoint(call) else { return }
        connect(endpoint.host, port: endpoint.port, timeoutMs: endpoint.timeout, data: nil) { result in
            switch result {
            case .success:
                call.resolve(["success": true])
            case .failure(let error):
                call.resolve(["success": false, "error": error.localizedDescription])
            }
        }
    }

    @objc func printRaster(_ call: CAPPluginCall) {
        guard let endpoint = validatedEndpoint(call) else { return }
        guard let base64 = call.getString("imageBase64"), !base64.isEmpty, base64.count <= 8_000_000,
              let png = Data(base64Encoded: base64),
              let source = CGImageSourceCreateWithData(png as CFData, nil),
              let properties = CGImageSourceCopyPropertiesAtIndex(source, 0, nil) as? [CFString: Any],
              let sourceWidth = properties[kCGImagePropertyPixelWidth] as? Int,
              let sourceHeight = properties[kCGImagePropertyPixelHeight] as? Int,
              (32...2048).contains(sourceWidth), (32...12000).contains(sourceHeight),
              let cgImage = CGImageSourceCreateImageAtIndex(source, 0, nil) else {
            call.reject("receipt image is invalid", "DIRECT_PRINT_INVALID_IMAGE")
            return
        }
        let paperWidth = call.getInt("paperWidth") == 58 ? 384 : 576
        let copies = min(3, max(1, call.getInt("copies") ?? 1))
        let cutPaper = call.getBool("cutPaper") ?? true
        let beepEnabled = call.getBool("beepEnabled") ?? false
        let beepMode = call.getString("beepMode") ?? "bel"
        let beepCount = min(9, max(1, call.getInt("beepCount") ?? 1))
        let beepDuration = min(9, max(1, call.getInt("beepDuration") ?? 2))
        DispatchQueue.global(qos: .userInitiated).async {
            do {
                let raster = try self.escPosRaster(cgImage, targetWidth: paperWidth, cutPaper: cutPaper, beepEnabled: beepEnabled, beepMode: beepMode, beepCount: beepCount, beepDuration: beepDuration)
                var payload = Data(capacity: raster.count * copies)
                for _ in 0..<copies { payload.append(raster) }
                self.connect(endpoint.host, port: endpoint.port, timeoutMs: endpoint.timeout, data: payload) { result in
                    switch result {
                    case .success:
                        call.resolve(["bytes": payload.count])
                    case .failure(let error):
                        call.reject("Direct print failed: \(error.localizedDescription)", "DIRECT_PRINT_FAILED", error)
                    }
                }
            } catch {
                call.reject("Direct print failed: \(error.localizedDescription)", "DIRECT_PRINT_FAILED", error)
            }
        }
    }

    @objc func openCashDrawer(_ call: CAPPluginCall) {
        guard let endpoint = validatedEndpoint(call) else { return }
        let pin = min(1, max(0, call.getInt("pin") ?? 0))
        let onMs = min(510, max(20, call.getInt("onMs") ?? 120))
        let offMs = min(510, max(20, call.getInt("offMs") ?? 240))
        let command = Data([0x1b, 0x70, UInt8(pin), UInt8(Int(round(Double(onMs) / 2.0))), UInt8(Int(round(Double(offMs) / 2.0)))])
        connect(endpoint.host, port: endpoint.port, timeoutMs: endpoint.timeout, data: command) { result in
            switch result {
            case .success: call.resolve(["bytes": command.count])
            case .failure(let error): call.reject("Cash drawer command failed: \(error.localizedDescription)", "CASH_DRAWER_FAILED", error)
            }
        }
    }

    private func validatedEndpoint(_ call: CAPPluginCall) -> (host: String, port: UInt16, timeout: Int)? {
        guard let host = call.getString("host")?.trimmingCharacters(in: .whitespacesAndNewlines), !host.isEmpty else {
            call.reject("host is required")
            return nil
        }
        guard isLocalPrinterHost(host) else {
            call.reject("Printer address is not on the local network", "PRINTER_NOT_LOCAL")
            return nil
        }
        let portValue = call.getInt("port") ?? 9100
        guard (1...65535).contains(portValue) else { call.reject("port is invalid"); return nil }
        let timeout = min(15000, max(1000, call.getInt("timeout") ?? 5000))
        return (host, UInt16(portValue), timeout)
    }

    private func isLocalPrinterHost(_ value: String) -> Bool {
        let host = value.lowercased()
        if host.hasSuffix(".local") || host.hasSuffix(".lan") { return true }
        if host == "::1" || host.hasPrefix("fe80:") || host.hasPrefix("fc") || host.hasPrefix("fd") { return true }
        let parts = host.split(separator: ".").compactMap { Int($0) }
        guard parts.count == 4, parts.allSatisfy({ (0...255).contains($0) }) else { return false }
        return parts[0] == 10
            || parts[0] == 127
            || (parts[0] == 169 && parts[1] == 254)
            || (parts[0] == 172 && (16...31).contains(parts[1]))
            || (parts[0] == 192 && parts[1] == 168)
    }

    private func connect(_ host: String, port: UInt16, timeoutMs: Int, data: Data?, completion: @escaping (Result<Void, Error>) -> Void) {
        guard let nwPort = NWEndpoint.Port(rawValue: port) else {
            completion(.failure(NSError(domain: "KemetDirectPrint", code: 1, userInfo: [NSLocalizedDescriptionKey: "Invalid printer port"])))
            return
        }
        let queue = DispatchQueue(label: "com.microsolution.kwaiter3.direct-print")
        let connection = NWConnection(host: NWEndpoint.Host(host), port: nwPort, using: .tcp)
        var finished = false
        func finish(_ result: Result<Void, Error>) {
            guard !finished else { return }
            finished = true
            connection.stateUpdateHandler = nil
            connection.cancel()
            completion(result)
        }
        connection.stateUpdateHandler = { state in
            switch state {
            case .ready:
                guard let data else { finish(.success(())); return }
                connection.send(content: data, completion: .contentProcessed { error in
                    if let error { finish(.failure(error)) }
                    else { finish(.success(())) }
                })
            case .failed(let error): finish(.failure(error))
            case .cancelled where !finished:
                finish(.failure(NSError(domain: "KemetDirectPrint", code: 2, userInfo: [NSLocalizedDescriptionKey: "Printer connection cancelled"])))
            default: break
            }
        }
        connection.start(queue: queue)
        queue.asyncAfter(deadline: .now() + .milliseconds(timeoutMs)) {
            if !finished {
                finish(.failure(NSError(domain: "KemetDirectPrint", code: 3, userInfo: [NSLocalizedDescriptionKey: "Printer connection timed out"])))
            }
        }
    }

    private func escPosRaster(_ source: CGImage, targetWidth: Int, cutPaper: Bool, beepEnabled: Bool, beepMode: String, beepCount: Int, beepDuration: Int) throws -> Data {
        let targetHeight = max(1, Int(Double(source.height) * Double(targetWidth) / Double(source.width)))
        guard targetHeight <= 12000 else {
            throw NSError(domain: "KemetDirectPrint", code: 4, userInfo: [NSLocalizedDescriptionKey: "Receipt is too long"])
        }
        let bytesPerRow = targetWidth * 4
        var pixels = [UInt8](repeating: 255, count: bytesPerRow * targetHeight)
        let rendered = pixels.withUnsafeMutableBytes { buffer -> Bool in
            guard let context = CGContext(
                data: buffer.baseAddress,
                width: targetWidth,
                height: targetHeight,
                bitsPerComponent: 8,
                bytesPerRow: bytesPerRow,
                space: CGColorSpaceCreateDeviceRGB(),
                bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue | CGBitmapInfo.byteOrder32Big.rawValue
            ) else { return false }
            context.setFillColor(UIColor.white.cgColor)
            context.fill(CGRect(x: 0, y: 0, width: targetWidth, height: targetHeight))
            context.interpolationQuality = .high
            context.translateBy(x: 0, y: CGFloat(targetHeight))
            context.scaleBy(x: 1, y: -1)
            context.draw(source, in: CGRect(x: 0, y: 0, width: targetWidth, height: targetHeight))
            return true
        }
        guard rendered else {
            throw NSError(domain: "KemetDirectPrint", code: 5, userInfo: [NSLocalizedDescriptionKey: "Cannot render receipt"])
        }
        let widthBytes = (targetWidth + 7) / 8
        var output = Data([0x1b, 0x40, 0x1d, 0x76, 0x30, 0x00,
                           UInt8(widthBytes & 0xff), UInt8((widthBytes >> 8) & 0xff),
                           UInt8(targetHeight & 0xff), UInt8((targetHeight >> 8) & 0xff)])
        output.reserveCapacity(output.count + widthBytes * targetHeight + 8)
        for y in 0..<targetHeight {
            for byteIndex in 0..<widthBytes {
                var value: UInt8 = 0
                for bit in 0..<8 {
                    let x = byteIndex * 8 + bit
                    if x >= targetWidth { continue }
                    let offset = y * bytesPerRow + x * 4
                    let luminance = (Int(pixels[offset]) * 299 + Int(pixels[offset + 1]) * 587 + Int(pixels[offset + 2]) * 114) / 1000
                    if luminance < 205 { value |= UInt8(1 << (7 - bit)) }
                }
                output.append(value)
            }
        }
        output.append(contentsOf: [0x0a, 0x0a, 0x0a])
        if cutPaper { output.append(contentsOf: [0x1d, 0x56, 0x42, 0x00]) }
        if beepEnabled {
            if beepMode.lowercased() == "esc-b" { output.append(contentsOf: [0x1b, 0x42, UInt8(beepCount), UInt8(beepDuration)]) }
            else { output.append(contentsOf: Array(repeating: UInt8(0x07), count: beepCount)) }
        }
        return output
    }
}
