import mariadb from 'mariadb'

const USER_EMAIL = 'shivajitiwariint@gmail.com'

const questions = [
// ─── DSA ───────────────────────────────────────────────────────────────────
{
  category: 'CODING', difficulty: 'HARD',
  q: 'Implement LRU Cache and LFU Cache.',
  whyAsked: 'Tests knowledge of hash maps, doubly linked lists, and cache eviction policies.',
  a: `## LRU Cache (Least Recently Used)

**Key Idea:** Combine a HashMap + Doubly Linked List. The list maintains access order; the map gives O(1) lookup.

**Algorithm:**
1. On \`get(key)\`: move node to head (most recent), return value. Return -1 if missing.
2. On \`put(key, val)\`: if exists, update & move to head. If new, add at head; if over capacity, evict tail.

\`\`\`python
from collections import OrderedDict

class LRUCache:
    def __init__(self, capacity: int):
        self.cap = capacity
        self.cache = OrderedDict()  # key -> value

    def get(self, key: int) -> int:
        if key not in self.cache:
            return -1
        self.cache.move_to_end(key)  # mark as recently used
        return self.cache[key]

    def put(self, key: int, value: int) -> None:
        if key in self.cache:
            self.cache.move_to_end(key)
        self.cache[key] = value
        if len(self.cache) > self.cap:
            self.cache.popitem(last=False)  # evict LRU (front)
\`\`\`

**Complexity:** O(1) get/put | O(capacity) space

---

## LFU Cache (Least Frequently Used)

**Key Idea:** Track frequency of each key. Among same-frequency keys, evict the LRU one.

\`\`\`python
from collections import defaultdict, OrderedDict

class LFUCache:
    def __init__(self, capacity: int):
        self.cap = capacity
        self.min_freq = 0
        self.key_val = {}           # key -> value
        self.key_freq = {}          # key -> frequency
        self.freq_keys = defaultdict(OrderedDict)  # freq -> OrderedDict of keys

    def _update(self, key):
        freq = self.key_freq[key]
        del self.freq_keys[freq][key]
        if not self.freq_keys[freq]:
            if self.min_freq == freq:
                self.min_freq += 1
        self.key_freq[key] = freq + 1
        self.freq_keys[freq + 1][key] = True

    def get(self, key: int) -> int:
        if key not in self.key_val:
            return -1
        self._update(key)
        return self.key_val[key]

    def put(self, key: int, value: int) -> None:
        if self.cap == 0:
            return
        if key in self.key_val:
            self.key_val[key] = value
            self._update(key)
        else:
            if len(self.key_val) >= self.cap:
                # evict LFU (LRU among min_freq)
                evict, _ = self.freq_keys[self.min_freq].popitem(last=False)
                del self.key_val[evict]
                del self.key_freq[evict]
            self.key_val[key] = value
            self.key_freq[key] = 1
            self.freq_keys[1][key] = True
            self.min_freq = 1
\`\`\`

**Complexity:** O(1) get/put | O(capacity) space

**Edge Cases:** capacity=0, single element, same-frequency tie-breaking.`
},

{
  category: 'CODING', difficulty: 'HARD',
  q: 'Find Median from Data Stream.',
  whyAsked: 'Tests heap usage and maintaining sorted order dynamically.',
  a: `## Find Median from Data Stream

**Key Idea:** Maintain two heaps:
- \`max_heap\` (left half) — max-heap storing smaller elements
- \`min_heap\` (right half) — min-heap storing larger elements
- Keep sizes balanced: |max_heap| == |min_heap| or |max_heap| == |min_heap| + 1

**Algorithm:**
1. \`addNum\`: Push to max_heap, then push max_heap's top to min_heap. Rebalance if min_heap grows larger.
2. \`findMedian\`: If equal size → average of both tops. Else → max_heap top.

\`\`\`python
import heapq

class MedianFinder:
    def __init__(self):
        self.max_heap = []  # left half (negate for max-heap)
        self.min_heap = []  # right half

    def addNum(self, num: int) -> None:
        heapq.heappush(self.max_heap, -num)
        # ensure all max_heap elements <= all min_heap elements
        heapq.heappush(self.min_heap, -heapq.heappop(self.max_heap))
        # rebalance sizes
        if len(self.min_heap) > len(self.max_heap):
            heapq.heappush(self.max_heap, -heapq.heappop(self.min_heap))

    def findMedian(self) -> float:
        if len(self.max_heap) > len(self.min_heap):
            return -self.max_heap[0]
        return (-self.max_heap[0] + self.min_heap[0]) / 2.0
\`\`\`

**Complexity:** addNum O(log n) | findMedian O(1) | Space O(n)

**Follow-up:** If numbers are in range [0,100], use counting sort array of size 101 for O(1) add, O(100) median.`
},

{
  category: 'CODING', difficulty: 'HARD',
  q: 'Word Ladder problem — find the shortest transformation sequence from one word to another.',
  whyAsked: 'Tests BFS on implicit graphs and string manipulation.',
  a: `## Word Ladder

**Key Idea:** Model as unweighted graph — each word is a node, edge exists if words differ by 1 letter. BFS gives shortest path.

**Algorithm:**
1. Add all words to a set for O(1) lookup.
2. BFS from \`beginWord\`. For each word, try replacing each character with a-z.
3. If the new word is in wordSet and unvisited, add to queue.
4. Return level count when \`endWord\` is found.

\`\`\`python
from collections import deque

def ladderLength(beginWord: str, endWord: str, wordList: list[str]) -> int:
    word_set = set(wordList)
    if endWord not in word_set:
        return 0

    queue = deque([(beginWord, 1)])
    visited = {beginWord}

    while queue:
        word, steps = queue.popleft()
        for i in range(len(word)):
            for c in 'abcdefghijklmnopqrstuvwxyz':
                new_word = word[:i] + c + word[i+1:]
                if new_word == endWord:
                    return steps + 1
                if new_word in word_set and new_word not in visited:
                    visited.add(new_word)
                    queue.append((new_word, steps + 1))
    return 0
\`\`\`

**Complexity:** O(M² × N) where M = word length, N = wordList size

**Optimization — Bidirectional BFS:**
Start BFS from both ends simultaneously. When the frontiers meet, return the sum of steps. Reduces time to O(M² × N/2).

**Edge Cases:** endWord not in wordList, beginWord == endWord, empty wordList.`
},

{
  category: 'CODING', difficulty: 'HARD',
  q: 'Merge K Sorted Lists.',
  whyAsked: 'Tests heap-based merging and linked list manipulation.',
  a: `## Merge K Sorted Lists

**Approach 1 — Min-Heap (optimal):**
Push the head of each list into a min-heap. Repeatedly extract the minimum and push its next node.

\`\`\`python
import heapq
from typing import Optional, List

class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

def mergeKLists(lists: List[Optional[ListNode]]) -> Optional[ListNode]:
    heap = []
    for i, node in enumerate(lists):
        if node:
            heapq.heappush(heap, (node.val, i, node))

    dummy = ListNode(0)
    curr = dummy

    while heap:
        val, i, node = heapq.heappop(heap)
        curr.next = node
        curr = curr.next
        if node.next:
            heapq.heappush(heap, (node.next.val, i, node.next))

    return dummy.next
\`\`\`

**Complexity:** O(N log K) where N = total nodes, K = number of lists | Space O(K)

**Approach 2 — Divide & Conquer:**
Recursively merge pairs of lists. Reduces to log K merge rounds.

\`\`\`python
def mergeKLists(lists):
    if not lists:
        return None
    while len(lists) > 1:
        merged = []
        for i in range(0, len(lists), 2):
            l1 = lists[i]
            l2 = lists[i + 1] if i + 1 < len(lists) else None
            merged.append(mergeTwoLists(l1, l2))
        lists = merged
    return lists[0]

def mergeTwoLists(l1, l2):
    dummy = ListNode(0)
    curr = dummy
    while l1 and l2:
        if l1.val <= l2.val:
            curr.next, l1 = l1, l1.next
        else:
            curr.next, l2 = l2, l2.next
        curr = curr.next
    curr.next = l1 or l2
    return dummy.next
\`\`\`

**Complexity:** O(N log K) | Space O(1) for D&C (no extra heap)

**Edge Cases:** Empty lists, single list, lists of different lengths.`
},

{
  category: 'CODING', difficulty: 'MEDIUM',
  q: 'Detect Cycle in a Directed Graph.',
  whyAsked: 'Tests DFS with coloring and understanding of directed vs undirected cycle detection.',
  a: `## Detect Cycle in a Directed Graph

**Key Idea:** Use DFS with 3-color marking:
- **WHITE (0):** Not visited
- **GRAY (1):** Currently in recursion stack (being processed)
- **BLACK (2):** Fully processed

A cycle exists if we encounter a GRAY node during DFS.

\`\`\`python
from typing import List

def hasCycle(numCourses: int, prerequisites: List[List[int]]) -> bool:
    graph = [[] for _ in range(numCourses)]
    for a, b in prerequisites:
        graph[b].append(a)

    color = [0] * numCourses  # 0=white, 1=gray, 2=black

    def dfs(node):
        color[node] = 1  # mark gray (in stack)
        for neighbor in graph[node]:
            if color[neighbor] == 1:  # back edge = cycle
                return True
            if color[neighbor] == 0 and dfs(neighbor):
                return True
        color[node] = 2  # mark black (done)
        return False

    return any(dfs(i) for i in range(numCourses) if color[i] == 0)
\`\`\`

**Complexity:** O(V + E) | Space O(V)

**Iterative approach (Kahn's Algorithm / Topological Sort):**
\`\`\`python
from collections import deque

def hasCycle(n, edges):
    in_degree = [0] * n
    graph = [[] for _ in range(n)]
    for a, b in edges:
        graph[b].append(a)
        in_degree[a] += 1

    queue = deque(i for i in range(n) if in_degree[i] == 0)
    count = 0
    while queue:
        node = queue.popleft()
        count += 1
        for neighbor in graph[node]:
            in_degree[neighbor] -= 1
            if in_degree[neighbor] == 0:
                queue.append(neighbor)

    return count != n  # if not all nodes processed, cycle exists
\`\`\`

**Note:** For undirected graphs, use simple visited set — don't revisit parent.`
},

{
  category: 'CODING', difficulty: 'MEDIUM',
  q: "Maximum Subarray Sum — Kadane's algorithm and its variations.",
  whyAsked: "Classic DP problem; tests understanding of local vs global optimum and Kadane's algorithm.",
  a: `## Maximum Subarray Sum — Kadane's Algorithm

**Key Idea:** At each index, decide whether to extend the current subarray or start fresh. Track the running max.

\`\`\`python
def maxSubArray(nums: list[int]) -> int:
    max_sum = curr_sum = nums[0]
    for n in nums[1:]:
        curr_sum = max(n, curr_sum + n)  # extend or restart
        max_sum = max(max_sum, curr_sum)
    return max_sum
\`\`\`

**Complexity:** O(n) | Space O(1)

---

## Variation 1: Return the Subarray Indices

\`\`\`python
def maxSubArrayWithIndices(nums):
    max_sum = curr_sum = nums[0]
    start = end = temp_start = 0
    for i in range(1, len(nums)):
        if nums[i] > curr_sum + nums[i]:
            curr_sum = nums[i]
            temp_start = i
        else:
            curr_sum += nums[i]
        if curr_sum > max_sum:
            max_sum = curr_sum
            start, end = temp_start, i
    return max_sum, start, end
\`\`\`

## Variation 2: Maximum Circular Subarray Sum

\`\`\`python
def maxCircularSubArray(nums):
    total = sum(nums)
    # Case 1: max subarray doesn't wrap → standard Kadane
    max_normal = maxSubArray(nums)
    # Case 2: max subarray wraps → total - min subarray
    min_sub = minSubArray(nums)
    # Edge: all negative numbers → return max_normal
    return max(max_normal, total - min_sub) if total != min_sub else max_normal
\`\`\`

## Variation 3: Maximum Product Subarray

\`\`\`python
def maxProduct(nums):
    max_p = min_p = result = nums[0]
    for n in nums[1:]:
        candidates = (n, max_p * n, min_p * n)
        max_p, min_p = max(candidates), min(candidates)
        result = max(result, max_p)
    return result
\`\`\`

**Edge Cases:** All negatives, single element, array with zeros.`
},

{
  category: 'CODING', difficulty: 'MEDIUM',
  q: 'Kth Largest Element in a Stream.',
  whyAsked: 'Tests min-heap usage and streaming data handling.',
  a: `## Kth Largest Element in a Stream

**Key Idea:** Maintain a min-heap of size K. The heap's minimum is always the Kth largest seen so far.

\`\`\`python
import heapq

class KthLargest:
    def __init__(self, k: int, nums: list[int]):
        self.k = k
        self.heap = []
        for n in nums:
            self.add(n)

    def add(self, val: int) -> int:
        heapq.heappush(self.heap, val)
        if len(self.heap) > self.k:
            heapq.heappop(self.heap)  # remove smallest
        return self.heap[0]  # kth largest = min of heap

# Usage:
# kth = KthLargest(3, [4, 5, 8, 2])
# kth.add(3)  → 4
# kth.add(5)  → 5
# kth.add(10) → 5
# kth.add(9)  → 8
\`\`\`

**Complexity:** Constructor O(N log K) | add() O(log K) | Space O(K)

**Variation — Kth Largest in an Array (one-shot):**

\`\`\`python
import heapq

def findKthLargest(nums: list[int], k: int) -> int:
    return heapq.nlargest(k, nums)[-1]  # O(N log K)

# Or using QuickSelect for O(N) average:
def findKthLargest_quickselect(nums, k):
    k = len(nums) - k  # kth largest = (n-k)th smallest
    def quickselect(l, r):
        pivot, p = nums[r], l
        for i in range(l, r):
            if nums[i] <= pivot:
                nums[i], nums[p] = nums[p], nums[i]
                p += 1
        nums[p], nums[r] = nums[r], nums[p]
        if p > k: return quickselect(l, p - 1)
        if p < k: return quickselect(p + 1, r)
        return nums[p]
    return quickselect(0, len(nums) - 1)
\`\`\`

**QuickSelect:** O(N) average, O(N²) worst | O(1) space`
},

{
  category: 'CODING', difficulty: 'HARD',
  q: 'Design a Scheduler with Task Priorities.',
  whyAsked: 'Tests priority queue design, OOP, and real-world system thinking.',
  a: `## Task Scheduler with Priorities

**Design Requirements:**
- Schedule tasks with priority, execute highest-priority first
- Support: add task, execute next, peek, cancel task
- Tie-breaking: FIFO (tasks added earlier run first at same priority)

\`\`\`python
import heapq
from dataclasses import dataclass, field
from typing import Callable, Optional
import time

@dataclass(order=True)
class Task:
    priority: int          # lower = higher priority
    sequence: int          # tie-breaker: insertion order
    task_id: str = field(compare=False)
    func: Callable = field(compare=False)
    cancelled: bool = field(default=False, compare=False)

class PriorityScheduler:
    def __init__(self):
        self._heap = []
        self._counter = 0
        self._tasks = {}  # task_id -> Task

    def schedule(self, task_id: str, func: Callable, priority: int = 5) -> str:
        task = Task(
            priority=priority,
            sequence=self._counter,
            task_id=task_id,
            func=func
        )
        self._counter += 1
        heapq.heappush(self._heap, task)
        self._tasks[task_id] = task
        return task_id

    def cancel(self, task_id: str) -> bool:
        if task_id in self._tasks:
            self._tasks[task_id].cancelled = True  # lazy deletion
            return True
        return False

    def execute_next(self) -> Optional[str]:
        while self._heap:
            task = heapq.heappop(self._heap)
            if not task.cancelled:
                task.func()
                del self._tasks[task.task_id]
                return task.task_id
        return None

    def peek(self) -> Optional[str]:
        while self._heap and self._heap[0].cancelled:
            heapq.heappop(self._heap)
        return self._heap[0].task_id if self._heap else None

# Usage
scheduler = PriorityScheduler()
scheduler.schedule("t1", lambda: print("low priority"), priority=10)
scheduler.schedule("t2", lambda: print("high priority"), priority=1)
scheduler.schedule("t3", lambda: print("medium"), priority=5)
scheduler.execute_next()  # runs t2 (priority=1)
\`\`\`

**Complexity:** schedule O(log n) | execute_next O(log n) | cancel O(1) lazy

**Extension — Time-based scheduling:**
Add \`run_at: float\` field. Use \`(run_at, priority, sequence)\` as heap key. Background thread polls and executes due tasks.`
},

// ─── System Design ──────────────────────────────────────────────────────────
{
  category: 'SYSTEM_DESIGN', difficulty: 'HARD',
  q: 'Design a scalable Chat Application like WhatsApp or Slack.',
  whyAsked: 'Tests real-time communication, WebSockets, message storage, and fan-out patterns.',
  a: `## Scalable Chat Application Design

### Requirements
**Functional:** 1:1 messaging, group chats, online/offline status, message history, read receipts, media sharing.
**Non-Functional:** <100ms message delivery, 99.99% uptime, 100M DAU, end-to-end encryption.

### Capacity Estimation
- 100M DAU, each sends 50 messages/day → 5B messages/day → ~58K messages/sec
- Message size ~1KB → 5TB/day storage
- Active connections: ~50M concurrent WebSockets

### High-Level Architecture
\`\`\`
Client → Load Balancer → WebSocket Servers (stateful)
                      → Message Service → Kafka → Message Workers → Cassandra
                      → Presence Service → Redis
                      → Notification Service (push for offline users)
\`\`\`

### Core Components

**1. WebSocket Servers (Connection Layer)**
- Sticky sessions via consistent hashing (user always hits same server)
- Each server maintains active socket map: userId → socket
- Horizontally scalable; use a Redis Pub/Sub layer so servers can route cross-server messages

**2. Message Service & Storage**
- Kafka for async message fan-out (decouples send from delivery)
- Cassandra for messages — optimized for write-heavy, time-series data
  - Partition key: \`(conversation_id)\`, clustering: \`(created_at DESC)\`
- Message Schema: \`{msg_id (UUID), conv_id, sender_id, content, type, timestamp, status}\`

**3. Presence Service**
- Redis with TTL per userId: heartbeat every 10s, TTL=30s
- On connect/disconnect, publish event to presence channel

**4. Fan-out (Group Messages)**
- For small groups (<500): fan-out on write (push to each member's inbox)
- For large groups: fan-out on read (store once, each client fetches on open)

**5. Media Sharing**
- Client uploads to S3 directly (pre-signed URL)
- Message contains CDN URL reference, not binary data

### Database Choices
| Data | Store | Reason |
|------|-------|--------|
| Messages | Cassandra | Write-heavy, time-series, high availability |
| User profiles | PostgreSQL | Relational, ACID |
| Sessions/Presence | Redis | Low latency, TTL support |
| Media | S3 + CloudFront CDN | Object storage, global distribution |

### Scalability
- WebSocket servers: scale horizontally, use Redis Pub/Sub for cross-server routing
- Kafka partitioned by conversation_id for ordered delivery
- Read replicas for Cassandra in each region

### Trade-offs
- **Eventual consistency** for message delivery (at-least-once with deduplication)
- **CAP:** Choose AP — prefer availability; handle duplicates client-side with message IDs`
},

{
  category: 'SYSTEM_DESIGN', difficulty: 'MEDIUM',
  q: 'Design a URL Shortener (like bit.ly).',
  whyAsked: 'Classic system design: hashing, redirection, caching, and scale.',
  a: `## URL Shortener Design

### Requirements
**Functional:** Shorten URL, redirect short → original, custom aliases, expiry.
**Non-Functional:** 100M URLs/day write, 10B redirects/day read (100:1 read:write), <10ms redirect latency, 10-year retention.

### Capacity
- 100M new URLs/day → ~1150/sec writes
- 10B redirects/day → ~116K/sec reads
- Storage: 100M × 365 × 10 years × 500B ≈ 180TB

### Short Code Generation (Key Design Decision)

**Option 1 — MD5 Hash (chosen):**
1. MD5(longURL) → 128-bit hash → Base62 encode → take first 7 chars
2. 62⁷ ≈ 3.5 trillion combinations — sufficient
3. Collision: check DB; if exists, append counter and re-hash

**Option 2 — Counter-based:**
- Global counter → Base62 encode. Simple but single point of failure.
- Use distributed ID generator (Twitter Snowflake pattern).

\`\`\`python
import hashlib, base64

def shorten(long_url: str) -> str:
    md5 = hashlib.md5(long_url.encode()).digest()
    encoded = base64.urlsafe_b64encode(md5).decode()
    return encoded[:7]
\`\`\`

### Architecture
\`\`\`
Write: Client → API Server → Check DB → Generate code → Store in DB + Cache
Read:  Client → CDN / Cache → (miss) → DB Lookup → 301/302 Redirect
\`\`\`

### Database Schema
\`\`\`sql
CREATE TABLE urls (
  short_code VARCHAR(10) PRIMARY KEY,
  long_url   TEXT NOT NULL,
  user_id    INT,
  created_at DATETIME,
  expires_at DATETIME,
  clicks     BIGINT DEFAULT 0
);
\`\`\`

### Caching (Critical for Read Performance)
- Redis cache: short_code → long_url, TTL = 24h
- Cache-aside pattern: on miss, load from DB and cache
- Eviction: LRU; hot URLs stay in cache

### Redirect: 301 vs 302
- **301 (Permanent):** Browser caches redirect → fewer server hits, but can't update
- **302 (Temporary):** Every request hits server → accurate analytics, updatable

### Scalability
- Read replicas for DB (100:1 read:write ratio)
- CDN for globally distributed redirects
- Horizontal API servers behind load balancer
- Async click counter updates via Kafka (avoid write bottleneck)`
},

{
  category: 'SYSTEM_DESIGN', difficulty: 'HARD',
  q: 'Design a distributed Notification System.',
  whyAsked: 'Tests async processing, fan-out, multi-channel delivery, and failure handling.',
  a: `## Distributed Notification System

### Requirements
**Functional:** Push (mobile), email, SMS, in-app notifications. User preferences (opt-out per channel). Scheduled and triggered notifications.
**Non-Functional:** 10M notifications/day, <1s delivery for push, at-least-once delivery, 99.9% uptime.

### Architecture
\`\`\`
Event Sources → Notification Service → Kafka Topics (per channel)
                                    ↓              ↓              ↓
                              Push Workers   Email Workers   SMS Workers
                                    ↓              ↓              ↓
                              FCM/APNs         SendGrid       Twilio
\`\`\`

### Core Components

**1. Notification Service (API + Orchestrator)**
- Accepts notification events (REST or Kafka consumer)
- Checks user preferences → filters channels
- Publishes to channel-specific Kafka topics
- Rate limits per user (no spam)

**2. Template Service**
- Stores notification templates with variable substitution
- Supports i18n, A/B variants

**3. Channel Workers (Push / Email / SMS)**
- Kafka consumers, independently scalable
- Retry with exponential backoff on 3rd-party failures
- Dead-letter queue (DLQ) for failed deliveries after N retries

**4. User Preference Service**
- Stores per-user, per-channel opt-in/out
- Cached in Redis (read on every notification)

**5. Delivery Tracking**
- Status: PENDING → SENT → DELIVERED → READ
- Store in Cassandra (write-heavy time-series)

### Database Design
\`\`\`sql
notifications: id, user_id, type, title, body, channel, status, created_at, sent_at
user_preferences: user_id, channel, enabled, quiet_hours_start, quiet_hours_end
notification_logs: notification_id, attempt, status, error, timestamp
\`\`\`

### Handling Scale
- Kafka partitioned by user_id → ordered per-user delivery
- Workers auto-scale based on queue depth
- Priority queue: transactional (OTP, payment) > marketing

### Failure Handling
- Retry queue with exponential backoff (1s, 2s, 4s, 8s, up to 5 attempts)
- DLQ for manual inspection
- Circuit breaker around 3rd-party providers (FCM, SendGrid)
- Fallback: if push fails, try email

### Idempotency
- Each notification has unique idempotency key
- Workers check before processing to avoid duplicate sends`
},

{
  category: 'SYSTEM_DESIGN', difficulty: 'HARD',
  q: 'How would you scale a Video Streaming platform like YouTube or Netflix?',
  whyAsked: 'Tests CDN, encoding pipelines, adaptive bitrate streaming, and massive scale handling.',
  a: `## Video Streaming Platform Design

### Requirements
**Functional:** Upload video, transcode, stream at multiple qualities, search, recommendations.
**Non-Functional:** 500 hours of video uploaded/min, 1B DAU, global distribution, <2s start time.

### High-Level Architecture
\`\`\`
Upload → Object Storage → Transcoding Pipeline → CDN
Stream → User → Nearest CDN Edge → Origin (on miss)
\`\`\`

### Video Upload & Processing Pipeline

1. **Chunked Upload:** Client splits video into 5MB chunks, uploads to pre-signed S3 URLs in parallel. Resume on failure.
2. **Transcoding Service:** Triggered by S3 event → message in SQS → Transcoder workers
   - Output: multiple resolutions (240p, 480p, 720p, 1080p, 4K)
   - Format: HLS (.m3u8 + .ts segments) or DASH
   - Per-resolution bitrate ladder for Adaptive Bitrate (ABR)
3. **Metadata Storage:** PostgreSQL (video metadata) + Elasticsearch (search)

### Adaptive Bitrate Streaming (ABR)
- Server generates HLS manifest listing all quality levels
- Client player monitors bandwidth and switches quality automatically
- Segment size: 2-6 seconds (balance between switching speed and efficiency)

### CDN Architecture
- Videos stored on Origin (S3)
- CDN edge nodes worldwide cache popular content
- Cache key: video_id + quality + segment_number
- Long TTL for video segments (immutable once transcoded)
- Pull-based caching: CDN fetches from origin on first request, caches for future

### Storage Estimation
- 500 hrs/min × 60 min × 24h × 365 = 262M hours/year
- 1 hour at 1080p ≈ 4GB; with 5 quality levels ≈ 10GB/hour
- 262M × 10GB = 2.6 exabytes/year → tiered storage (hot S3, cold Glacier)

### Recommendation System
- Collaborative filtering (user-item matrix) + content-based filtering
- Pre-compute recommendations with Spark, store in Redis for fast serving
- A/B test different recommendation models

### Key Database Choices
| Data | Store |
|------|-------|
| Video metadata | PostgreSQL |
| Search index | Elasticsearch |
| View counts | Redis (real-time) + async flush to DB |
| Watch history | Cassandra (time-series, append-only) |
| Recommendations | Redis |`
},

{
  category: 'SYSTEM_DESIGN', difficulty: 'HARD',
  q: 'Design a Payment System like Razorpay or Stripe.',
  whyAsked: 'Tests ACID transactions, idempotency, fault tolerance, and financial system design.',
  a: `## Payment System Design

### Requirements
**Functional:** Accept payments (card, UPI, wallet), process refunds, payout to merchants, transaction history.
**Non-Functional:** ACID guarantees, idempotent APIs, PCI-DSS compliance, 99.999% uptime, fraud detection.

### Architecture
\`\`\`
Merchant → Payment Gateway → Payment Processor
                          → Fraud Detection Service
                          → Ledger Service (double-entry bookkeeping)
                          → Notification Service
                          → Bank/Card Network (Visa, Mastercard)
\`\`\`

### Core Components

**1. Payment API (Idempotent)**
\`\`\`
POST /v1/payments
{
  "idempotency_key": "unique-client-key",
  "amount": 10000,  // in paise
  "currency": "INR",
  "payment_method": {...},
  "merchant_id": "mid_123"
}
\`\`\`
- Server stores idempotency_key → response mapping in Redis (24h TTL)
- Duplicate requests return the same response without reprocessing

**2. Payment State Machine**
\`\`\`
CREATED → AUTHORIZED → CAPTURED → SETTLED
                    ↓
                 FAILED / VOIDED
CAPTURED → REFUND_INITIATED → REFUNDED
\`\`\`

**3. Ledger Service (Double-Entry Accounting)**
- Every transaction creates two journal entries (debit + credit)
- Immutable append-only log
- Eventual balance = sum of all entries per account
\`\`\`sql
CREATE TABLE journal_entries (
  id BIGINT PRIMARY KEY,
  transaction_id VARCHAR,
  account_id VARCHAR,
  amount BIGINT,        -- positive=credit, negative=debit
  currency VARCHAR(3),
  created_at TIMESTAMP
);
\`\`\`

**4. Fraud Detection**
- Real-time ML scoring on each payment (velocity checks, device fingerprinting, geo-anomaly)
- Block threshold: >0.9 score
- Review threshold: 0.7-0.9

### Database: PostgreSQL with Sharding
- Shard by merchant_id for isolation
- Read replicas for reporting queries
- SERIALIZABLE isolation for payment records

### Reliability
- 2-phase commit for distributed transactions (if crossing service boundaries)
- Saga pattern for long-running workflows (authorize → capture → settle)
- Retry with exponential backoff + idempotency keys
- Reconciliation jobs: compare internal ledger vs bank statements daily

### Security (PCI-DSS)
- Card numbers tokenized (store token, never raw PAN)
- TLS 1.3 in transit, AES-256 at rest
- Separate PCI environment with strict network segmentation`
},

{
  category: 'SYSTEM_DESIGN', difficulty: 'MEDIUM',
  q: 'How do you design an API Rate Limiter?',
  whyAsked: 'Tests distributed systems thinking, algorithm selection, and Redis usage.',
  a: `## API Rate Limiter Design

### Requirements
- Limit requests per user/IP (e.g., 100 req/min)
- Distributed (works across multiple API server instances)
- Low latency (<1ms overhead), no false positives

### Algorithms

**1. Fixed Window Counter (simplest)**
- Count requests in current time window (e.g., this minute)
- Problem: burst at window boundary (180 req in 2 seconds spanning two windows)

**2. Sliding Window Log**
- Store timestamp of each request; count timestamps in last 60s
- Accurate but high memory O(max_requests)

**3. Sliding Window Counter (best balance)**
\`\`\`
Rate = prev_window_count × ((window_size - elapsed) / window_size) + curr_window_count
\`\`\`
- Low memory O(1), smoothly handles boundary bursts

**4. Token Bucket (recommended for APIs)**
- Bucket holds up to N tokens, refills at rate R tokens/sec
- Each request consumes 1 token; reject if empty
- Allows bursting up to bucket size

**5. Leaky Bucket**
- Queue requests; process at fixed rate. Smooths traffic but adds latency.

### Implementation with Redis (Distributed)

\`\`\`python
import redis
import time

r = redis.Redis()

def is_allowed(user_id: str, limit: int = 100, window: int = 60) -> bool:
    key = f"rate:{user_id}:{int(time.time()) // window}"
    pipe = r.pipeline()
    pipe.incr(key)
    pipe.expire(key, window * 2)
    results = pipe.execute()
    count = results[0]
    return count <= limit
\`\`\`

**Lua script for atomicity:**
\`\`\`lua
local key = KEYS[1]
local limit = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local count = redis.call('INCR', key)
if count == 1 then redis.call('EXPIRE', key, window) end
return count <= limit
\`\`\`

### Architecture
\`\`\`
Request → Rate Limiter Middleware → Redis Cluster → Allow/Reject
                                                 ↓ (X-RateLimit headers)
                                 X-RateLimit-Limit: 100
                                 X-RateLimit-Remaining: 47
                                 X-RateLimit-Reset: 1720000060
\`\`\`

### Edge Cases
- Different limits per tier (free: 100/min, paid: 10000/min)
- Per-endpoint limits (login: 5/min, search: 1000/min)
- Distributed Redis with Lua scripts for atomic incr+check
- Return **429 Too Many Requests** with Retry-After header`
},

{
  category: 'SYSTEM_DESIGN', difficulty: 'HARD',
  q: 'Design an E-commerce Checkout System.',
  whyAsked: 'Tests inventory management, payment integration, concurrency, and distributed transactions.',
  a: `## E-commerce Checkout System Design

### Requirements
**Functional:** Cart management, inventory check, order creation, payment processing, order confirmation, inventory deduction.
**Non-Functional:** No overselling, idempotent checkout, handle 10K concurrent checkouts, <3s end-to-end.

### Checkout Flow
\`\`\`
1. Lock inventory (reserve)
2. Create order (PENDING)
3. Process payment
4. Confirm order + deduct inventory (on success)
5. Release reservation (on failure)
\`\`\`

### Inventory Management (Critical: No Overselling)

**Optimistic Locking:**
\`\`\`sql
-- Reserve with version check
UPDATE inventory
SET reserved = reserved + quantity, version = version + 1
WHERE product_id = ? AND (quantity - reserved) >= ? AND version = ?
-- If 0 rows affected → concurrent modification, retry
\`\`\`

**Redis for Real-time Stock:**
\`\`\`python
def reserve_stock(product_id, qty, redis_conn):
    key = f"stock:{product_id}"
    result = redis_conn.decrby(key, qty)
    if result < 0:
        redis_conn.incrby(key, qty)  # rollback
        raise InsufficientStockError()
\`\`\`

### Order Service + Saga Pattern
\`\`\`
CheckoutSaga:
  Step 1: ReserveInventory       → compensate: ReleaseInventory
  Step 2: CreateOrder(PENDING)   → compensate: CancelOrder
  Step 3: ProcessPayment         → compensate: RefundPayment
  Step 4: ConfirmOrder(PAID)     → compensate: N/A (terminal success)
  Step 5: DeductInventory        → compensate: RestoreInventory
\`\`\`

### Database Schema
\`\`\`sql
orders: id, user_id, status, total_amount, idempotency_key, created_at
order_items: id, order_id, product_id, quantity, unit_price
inventory: product_id, quantity, reserved, version
payments: id, order_id, gateway_payment_id, status, amount
\`\`\`

### Flash Sale Handling (High Concurrency)
- Pre-warm Redis with stock count before sale
- Queue-based checkout: put requests in Redis queue; process serially per product
- Limit active reservations with TTL (15 min) — auto-release if payment not completed

### Cart Service
- Store cart in Redis (user_id → cart items), TTL = 7 days
- Merge guest cart on login

### Key Trade-offs
- **Optimistic vs Pessimistic locking:** Optimistic for low-contention; pessimistic (SELECT FOR UPDATE) for flash sales
- **Sync vs Async payment:** Sync gives immediate UX; async handles payment timeouts better`
},

{
  category: 'SYSTEM_DESIGN', difficulty: 'HARD',
  q: 'Design a Ride-Hailing app like Uber or Ola.',
  whyAsked: 'Tests geospatial indexing, real-time matching, pricing algorithms, and location tracking.',
  a: `## Ride-Hailing App Design

### Requirements
**Functional:** Request ride, match driver, real-time tracking, ETA, dynamic pricing, payment, ratings.
**Non-Functional:** Match driver in <30s, 10M DAU, 1M concurrent rides, location updates every 5s.

### High-Level Architecture
\`\`\`
Rider App → API Gateway → Ride Request Service
                       → Location Service (WebSocket/MQTT)
                       → Matching Service
                       → Pricing Service
                       → Notification Service
Driver App → Location Service (push every 5s)
\`\`\`

### Location Service (Core Challenge)

**Storage:** Redis Geospatial (GEOADD / GEORADIUS / GEOSEARCH)
\`\`\`python
# Driver updates location
redis.geoadd("drivers:online", longitude, latitude, driver_id)

# Find drivers within 5km
drivers = redis.geosearch("drivers:online",
    longitude=rider_lon, latitude=rider_lat,
    radius=5, unit="km",
    sort="ASC", count=10)
\`\`\`

- Location updates: 1M drivers × 1 update/5s = 200K writes/sec → Redis cluster handles this
- Store last location + timestamp; remove driver if not updated >30s (offline)

### Matching Service
1. Find available drivers within radius (Redis GEO)
2. Score each driver: distance + acceptance rate + rating
3. Offer ride to top driver; timeout 10s; move to next on reject
4. On accept: lock driver (Redis SETNX), notify rider

### Pricing (Surge Pricing)
\`\`\`
base_fare + (distance × per_km_rate) + (time × per_min_rate)
surge_multiplier = f(demand / supply in area)
# If demand/supply > 2.0 → surge 1.5x, > 3.0 → surge 2.0x
\`\`\`
- Compute supply/demand per H3 hexagonal grid cell (Uber's approach)
- Update surge every 60s

### Trip State Machine
\`\`\`
REQUESTED → DRIVER_ASSIGNED → DRIVER_ARRIVING → TRIP_STARTED → COMPLETED
         → CANCELLED
\`\`\`

### Real-Time Tracking
- Driver sends GPS every 5s via WebSocket
- Server pushes location to rider via WebSocket
- ETA recalculated each location update using road-network graph (not straight-line)

### Database Choices
| Data | Store | Reason |
|------|-------|--------|
| Driver locations | Redis GEO | O(log n) spatial queries, sub-ms latency |
| Trip records | PostgreSQL | ACID, relational queries |
| Location history | Cassandra | Write-heavy time-series |
| Driver availability | Redis | Fast updates, TTL auto-expiry |

### Scalability
- Partition location service by geo region (city-level)
- Each city is an independent deployment unit
- Matching service reads from local Redis replica`
},
]

async function main() {
  const dbUrl = process.env.DATABASE_URL
  if (!dbUrl) throw new Error('Set DATABASE_URL')

  const parsed = new URL(dbUrl)
  const pool = mariadb.createPool({
    host: parsed.hostname,
    port: parseInt(parsed.port) || 3306,
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: parsed.pathname.replace(/^\//, ''),
    connectionLimit: 2,
    ssl: { rejectUnauthorized: false },
  })

  const conn = await pool.getConnection()
  const rows = await conn.query('SELECT id FROM User WHERE email = ?', [USER_EMAIL])
  if (!rows.length) throw new Error(`User ${USER_EMAIL} not found`)
  const userId = rows[0].id
  console.log(`Seeding ${questions.length} questions for userId=${userId}\n`)

  for (let i = 0; i < questions.length; i++) {
    const { q, a, category, difficulty, whyAsked } = questions[i]
    await conn.query(
      `INSERT INTO interview_questions
         (userId, category, question, answer, difficulty, whyAsked, source, practiced, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, 'MANUAL', 0, NOW(), NOW())`,
      [userId, category, q, a, difficulty, whyAsked]
    )
    console.log(`[${i + 1}/${questions.length}] ✓ ${q.slice(0, 60)}`)
  }

  conn.release()
  await pool.end()
  console.log('\nDone!')
}

main().catch(e => { console.error(e.message); process.exit(1) })
