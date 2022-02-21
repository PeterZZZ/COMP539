package edu.rice.cs.urlshortener.server;

import edu.rice.comp539.urlshortener.proto.ShortenRequest;
import edu.rice.comp539.urlshortener.proto.ShortenResponse;
import edu.rice.comp539.urlshortener.proto.ShortenUrlGrpc;
import io.grpc.stub.StreamObserver;

import java.net.InetAddress;
import java.security.SecureRandom;
import java.util.Random;
import java.util.logging.Level;
import java.util.logging.Logger;

public class UrlShortenerImpl extends ShortenUrlGrpc.ShortenUrlImplBase {
  private static final Logger logger = Logger.getLogger(UrlShortenerImpl.class.getName());

  private final String serverName;

  public UrlShortenerImpl(String serverName) {
    if (serverName == null) {
      serverName = determineHostname();
    }
    this.serverName = serverName;
  }

  @Override
  public void shorten(ShortenRequest request, StreamObserver<ShortenResponse> responseObserver) {
    System.out.println("Received request " + request);
    responseObserver.onNext(ShortenResponse.newBuilder()
        .setShortUrl("shorty.sh/ShoRTENed")
        .build());
    responseObserver.onCompleted();
  }

  private static final Random RANDOM = new SecureRandom();

  private static String determineHostname() {
    try {
      return InetAddress.getLocalHost().getHostName();
    } catch (Exception ex) {
      logger.log(Level.INFO, "Failed to determine hostname. Will generate one", ex);
    }
    // Strange. Well, let's make an identifier for ourselves.
    return "generated-" + RANDOM.nextInt();
  }
}
