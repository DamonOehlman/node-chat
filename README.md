# Chat

A chat room crdt document type.

## Memory Usage / Performance Tests

The current implementation (using MuxDemux streams with a centralized CRDT document) consumed approximately 1.5 Gb of memory and was servicing ~560K client streams prior to the test being terminated.  A previous implementation using CRDT documents for both the room and the client implementation hit a similar memory usage figure with only 1K client instances.