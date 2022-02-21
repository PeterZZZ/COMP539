package edu.rice.cs.urlshortener.server;

import io.grpc.Server;
import io.grpc.ServerBuilder;
import io.grpc.health.v1.HealthCheckResponse;
import io.grpc.protobuf.services.ProtoReflectionService;
import io.grpc.services.HealthStatusManager;

import java.io.IOException;
import java.util.concurrent.TimeUnit;

public final class UrlShortenerService {

  public static void main(String[] args) throws IOException, InterruptedException {
    String host = "localhost";
    int port = 3333;
    switch (args.length) {
      case 0:
        break;
      case 2:
        host = args[1];
      case 1:
        port = Integer.parseInt(args[0]);
        break;
      default:
        throw new IllegalStateException();
    }

    HealthStatusManager health = new HealthStatusManager();
    final Server server = ServerBuilder.forPort(port)
        .addService(new UrlShortenerImpl(host))
        .addService(ProtoReflectionService.newInstance())
        .addService(health.getHealthService())
        .build()
        .start();
    System.out.println("Listening on port " + port);
    Runtime.getRuntime().addShutdownHook(new Thread() {
      @Override
      public void run() {
        // Start graceful shutdown
        server.shutdown();
        try {
          // Wait for RPCs to complete processing
          if (!server.awaitTermination(30, TimeUnit.SECONDS)) {
            // That was plenty of time. Let's cancel the remaining RPCs
            server.shutdownNow();
            // shutdownNow isn't instantaneous, so give a bit of time to clean resources up
            // gracefully. Normally this will be well under a second.
            server.awaitTermination(5, TimeUnit.SECONDS);
          }
        } catch (InterruptedException ex) {
          server.shutdownNow();
        }
      }
    });
    // This would normally be tied to the service's dependencies. For example, if HostnameGreeter
    // used a Channel to contact a required service, then when 'channel.getState() ==
    // TRANSIENT_FAILURE' we'd want to set NOT_SERVING. But HostnameGreeter has no dependencies, so
    // hard-coding SERVING is appropriate.
    health.setStatus("", HealthCheckResponse.ServingStatus.SERVING);
    server.awaitTermination();
  }
}
