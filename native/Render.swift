import Foundation
import Metal

struct RibbonUniforms {
    var resolution: SIMD2<Float>
    var time: Float
    var intensity: Float = 1
    var height: Float = 1
    var dispersion: Float = 1
    var bloom: Float = 1
    var full: Float = 1
}

struct RenderError: LocalizedError {
    let message: String
    var errorDescription: String? { message }
}

func render() throws {
    let arguments = CommandLine.arguments
    guard (3...5).contains(arguments.count) else {
        throw RenderError(message: "Usage: render shader.metal output.rgba [frames=107] [width=960]")
    }
    let frames = arguments.count > 3 ? Int(arguments[3]) ?? 0 : 107
    let width = arguments.count > 4 ? Int(arguments[4]) ?? 0 : 960
    guard frames > 0, width >= 16, width <= 8192 else {
        throw RenderError(message: "Frames must be positive; width must be between 16 and 8192.")
    }
    guard let device = MTLCreateSystemDefaultDevice(),
          let queue = device.makeCommandQueue() else {
        throw RenderError(message: "A Metal-capable GPU is required.")
    }
    let source = try String(contentsOfFile: arguments[1], encoding: .utf8)
    let library = try device.makeLibrary(source: source, options: nil)
    guard let function = library.makeFunction(name: "siriRibbon") else {
        throw RenderError(message: "The siriRibbon kernel was not found.")
    }
    let pipeline = try device.makeComputePipelineState(function: function)
    let height = width * 9 / 16
    let descriptor = MTLTextureDescriptor.texture2DDescriptor(
        pixelFormat: .rgba8Unorm, width: width, height: height, mipmapped: false
    )
    descriptor.usage = .shaderWrite
    descriptor.storageMode = .shared
    guard let texture = device.makeTexture(descriptor: descriptor) else {
        throw RenderError(message: "Could not allocate the output texture.")
    }
    guard FileManager.default.createFile(atPath: arguments[2], contents: nil) else {
        throw RenderError(message: "Could not create the output file.")
    }
    let output = try FileHandle(forWritingTo: URL(fileURLWithPath: arguments[2]))
    defer { try? output.close() }
    var pixels = [UInt8](repeating: 0, count: width * height * 4)
    let region = MTLRegionMake2D(0, 0, width, height)
    var timings: [Double] = []

    for frame in 0..<frames {
        var uniforms = RibbonUniforms(
            resolution: SIMD2(Float(width), Float(height)), time: Float(frame) / 30
        )
        guard let command = queue.makeCommandBuffer(),
              let encoder = command.makeComputeCommandEncoder() else {
            throw RenderError(message: "Could not create the compute command.")
        }
        encoder.setComputePipelineState(pipeline)
        encoder.setTexture(texture, index: 0)
        encoder.setBytes(&uniforms, length: MemoryLayout<RibbonUniforms>.stride, index: 0)
        encoder.dispatchThreads(
            MTLSize(width: width, height: height, depth: 1),
            threadsPerThreadgroup: MTLSize(width: 16, height: 16, depth: 1)
        )
        encoder.endEncoding()
        command.commit()
        command.waitUntilCompleted()
        if let error = command.error { throw error }
        timings.append((command.gpuEndTime - command.gpuStartTime) * 1000)
        texture.getBytes(&pixels, bytesPerRow: width * 4, from: region, mipmapLevel: 0)
        try output.write(contentsOf: Data(pixels))
    }

    timings.sort()
    let median = String(format: "%.3f", timings[timings.count / 2])
    print("\(device.name): \(frames) frames, \(width) × \(height), median GPU time \(median) ms")
}

do {
    try render()
} catch {
    FileHandle.standardError.write(Data("\(error.localizedDescription)\n".utf8))
    exit(1)
}
