import mariadb from 'mariadb'

const USER_EMAIL = 'shivajitiwariint@gmail.com'

const questions = [
// ─── DSA (8 more) ───────────────────────────────────────────────────────────
{
  category: 'CODING', difficulty: 'MEDIUM',
  q: 'Two Sum variations — hashmap, sorted array, k-sum.',
  whyAsked: 'Foundation of array problem-solving; tests hashmap vs two-pointer trade-off.',
  a: `## Two Sum Variations

### Variation 1: Basic Two Sum (unsorted, find indices)
**Approach:** HashMap for O(n) lookup.
\`\`\`javascript
function twoSum(nums, target) {
  const seen = new Map() // value -> index
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i]
    if (seen.has(complement)) return [seen.get(complement), i]
    seen.set(nums[i], i)
  }
  return []
}
\`\`\`
**Complexity:** O(n) time | O(n) space

### Variation 2: Two Sum II (sorted array, return 1-based indices)
**Approach:** Two pointers — no extra space needed.
\`\`\`javascript
function twoSumSorted(nums, target) {
  let l = 0, r = nums.length - 1
  while (l < r) {
    const s = nums[l] + nums[r]
    if (s === target) return [l + 1, r + 1]
    else if (s < target) l++
    else r--
  }
  return []
}
\`\`\`
**Complexity:** O(n) time | O(1) space

### Variation 3: 3-Sum (all unique triplets summing to 0)
\`\`\`javascript
function threeSum(nums) {
  nums.sort((a, b) => a - b)
  const result = []
  for (let i = 0; i < nums.length - 2; i++) {
    if (i > 0 && nums[i] === nums[i - 1]) continue // skip duplicates
    let l = i + 1, r = nums.length - 1
    while (l < r) {
      const s = nums[i] + nums[l] + nums[r]
      if (s === 0) {
        result.push([nums[i], nums[l], nums[r]])
        while (l < r && nums[l] === nums[l + 1]) l++
        while (l < r && nums[r] === nums[r - 1]) r--
        l++; r--
      } else if (s < 0) l++
      else r--
    }
  }
  return result
}
\`\`\`

### Variation 4: 4-Sum
Reduce to 3-Sum by fixing one element in outer loop. O(n³).

### Variation 5: K-Sum (generalized)
\`\`\`javascript
function kSum(nums, target, k) {
  nums.sort((a, b) => a - b)

  function helper(start, target, k) {
    if (k === 2) {
      const res = []
      let l = start, r = nums.length - 1
      while (l < r) {
        const s = nums[l] + nums[r]
        if (s === target) { res.push([nums[l], nums[r]]); l++; r-- }
        else if (s < target) l++
        else r--
      }
      return res
    }
    const result = []
    for (let i = start; i <= nums.length - k; i++) {
      if (i > start && nums[i] === nums[i - 1]) continue
      for (const sub of helper(i + 1, target - nums[i], k - 1)) {
        result.push([nums[i], ...sub])
      }
    }
    return result
  }

  return helper(0, target, k)
}
\`\`\`
**K-Sum Complexity:** O(n^(k-1))`
},

{
  category: 'CODING', difficulty: 'HARD',
  q: 'Binary Search on Answer — capacity, days, weights problems.',
  whyAsked: 'Tests ability to model optimization problems as binary search on the answer space.',
  a: `## Binary Search on Answer

**Pattern:** When you need to find minimum/maximum value satisfying a condition, binary search on the answer space.

**Key insight:** The answer space is monotonic — if X works, X+1 also works (or vice versa).

### Template
\`\`\`javascript
function solve(arr) {
  let lo = minPossible, hi = maxPossible
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2)
    if (feasible(mid)) hi = mid    // mid works, try smaller
    else lo = mid + 1              // mid doesn't work, need bigger
  }
  return lo
}
\`\`\`

### Problem 1: Capacity to Ship Packages Within D Days (LC 1011)
\`\`\`javascript
function shipWithinDays(weights, days) {
  function canShip(capacity) {
    let dayCount = 1, current = 0
    for (const w of weights) {
      if (current + w > capacity) { dayCount++; current = 0 }
      current += w
    }
    return dayCount <= days
  }

  let lo = Math.max(...weights)  // min capacity = heaviest package
  let hi = weights.reduce((a, b) => a + b, 0)  // max = all in one day
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2)
    if (canShip(mid)) hi = mid
    else lo = mid + 1
  }
  return lo
}
\`\`\`

### Problem 2: Koko Eating Bananas (LC 875)
\`\`\`javascript
function minEatingSpeed(piles, h) {
  function canFinish(k) {
    return piles.reduce((sum, p) => sum + Math.ceil(p / k), 0) <= h
  }
  let lo = 1, hi = Math.max(...piles)
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2)
    if (canFinish(mid)) hi = mid
    else lo = mid + 1
  }
  return lo
}
\`\`\`

### Problem 3: Split Array Largest Sum (LC 410)
Find minimum possible largest sum when splitting array into k subarrays.
\`\`\`javascript
function splitArray(nums, k) {
  function canSplit(maxSum) {
    let count = 1, curr = 0
    for (const n of nums) {
      if (curr + n > maxSum) { count++; curr = 0 }
      curr += n
    }
    return count <= k
  }
  let lo = Math.max(...nums), hi = nums.reduce((a, b) => a + b, 0)
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2)
    if (canSplit(mid)) hi = mid
    else lo = mid + 1
  }
  return lo
}
\`\`\`

**Complexity:** O(n log(sum)) — binary search × feasibility check`
},

{
  category: 'CODING', difficulty: 'HARD',
  q: 'Longest Increasing Subsequence (LIS) — DP and patience sorting.',
  whyAsked: 'Classic DP problem; O(n log n) solution tests deeper algorithmic knowledge.',
  a: `## Longest Increasing Subsequence (LIS)

### Approach 1: DP — O(n²)
\`\`\`javascript
function lengthOfLIS(nums) {
  const dp = new Array(nums.length).fill(1) // dp[i] = LIS length ending at i
  for (let i = 1; i < nums.length; i++) {
    for (let j = 0; j < i; j++) {
      if (nums[j] < nums[i]) {
        dp[i] = Math.max(dp[i], dp[j] + 1)
      }
    }
  }
  return Math.max(...dp)
}
\`\`\`

### Approach 2: Patience Sorting (Binary Search) — O(n log n)
Maintain a \`tails\` array where \`tails[i]\` = smallest tail of all LIS of length i+1.
\`\`\`javascript
function lengthOfLIS(nums) {
  const tails = []

  function binarySearch(target) {
    let lo = 0, hi = tails.length
    while (lo < hi) {
      const mid = Math.floor((lo + hi) / 2)
      if (tails[mid] < target) lo = mid + 1
      else hi = mid
    }
    return lo
  }

  for (const n of nums) {
    const pos = binarySearch(n)
    if (pos === tails.length) tails.push(n)  // extend LIS
    else tails[pos] = n                        // replace for optimal
  }
  return tails.length
}
// Note: tails is always sorted but NOT the actual LIS sequence!
\`\`\`

### Variation: Number of LIS
\`\`\`javascript
function findNumberOfLIS(nums) {
  const n = nums.length
  const dp = new Array(n).fill(1)   // LIS length ending at i
  const cnt = new Array(n).fill(1)  // count of LIS ending at i
  for (let i = 1; i < n; i++) {
    for (let j = 0; j < i; j++) {
      if (nums[j] < nums[i]) {
        if (dp[j] + 1 > dp[i]) {
          dp[i] = dp[j] + 1
          cnt[i] = cnt[j]
        } else if (dp[j] + 1 === dp[i]) {
          cnt[i] += cnt[j]
        }
      }
    }
  }
  const maxLen = Math.max(...dp)
  return dp.reduce((sum, l, i) => sum + (l === maxLen ? cnt[i] : 0), 0)
}
\`\`\``
},

{
  category: 'CODING', difficulty: 'HARD',
  q: 'Clone Graph and Clone a Linked List with Random Pointers.',
  whyAsked: 'Tests deep copy of non-linear structures using HashMap for visited tracking.',
  a: `## Clone Graph
**Key Idea:** DFS + Map tracking original node → cloned node.
\`\`\`javascript
class Node {
  constructor(val, neighbors = []) {
    this.val = val
    this.neighbors = neighbors
  }
}

function cloneGraph(node) {
  if (!node) return null
  const clones = new Map() // original -> clone

  function dfs(n) {
    if (clones.has(n)) return clones.get(n)
    const clone = new Node(n.val)
    clones.set(n, clone)
    for (const neighbor of n.neighbors) {
      clone.neighbors.push(dfs(neighbor))
    }
    return clone
  }

  return dfs(node)
}
\`\`\`
**Complexity:** O(V + E) | Space O(V)

---

## Clone Linked List with Random Pointers
\`\`\`javascript
class ListNode {
  constructor(val = 0, next = null, random = null) {
    this.val = val; this.next = next; this.random = random
  }
}

// Approach 1: HashMap — O(n) time and space
function copyRandomList(head) {
  if (!head) return null
  const map = new Map()
  let curr = head
  while (curr) {
    map.set(curr, new ListNode(curr.val))
    curr = curr.next
  }
  curr = head
  while (curr) {
    if (curr.next) map.get(curr).next = map.get(curr.next)
    if (curr.random) map.get(curr).random = map.get(curr.random)
    curr = curr.next
  }
  return map.get(head)
}

// Approach 2: O(1) space — interleave clones in original list
function copyRandomListO1(head) {
  if (!head) return null
  // Step 1: insert clone after each node
  let curr = head
  while (curr) {
    const clone = new ListNode(curr.val)
    clone.next = curr.next
    curr.next = clone
    curr = clone.next
  }
  // Step 2: assign random pointers
  curr = head
  while (curr) {
    if (curr.random) curr.next.random = curr.random.next
    curr = curr.next.next
  }
  // Step 3: separate the two lists
  const dummy = new ListNode(0)
  let cloneCurr = dummy
  curr = head
  while (curr) {
    cloneCurr.next = curr.next
    curr.next = curr.next.next
    cloneCurr = cloneCurr.next
    curr = curr.next
  }
  return dummy.next
}
\`\`\``
},

{
  category: 'CODING', difficulty: 'HARD',
  q: 'Serialize and Deserialize a Binary Tree.',
  whyAsked: 'Tests BFS/DFS tree traversal, string encoding, and reconstruction.',
  a: `## Serialize and Deserialize Binary Tree

\`\`\`javascript
class TreeNode {
  constructor(val = 0, left = null, right = null) {
    this.val = val; this.left = left; this.right = right
  }
}

// BFS approach
const serialize = (root) => {
  if (!root) return ''
  const result = []
  const queue = [root]
  while (queue.length) {
    const node = queue.shift()
    if (node) {
      result.push(String(node.val))
      queue.push(node.left)
      queue.push(node.right)
    } else {
      result.push('null')
    }
  }
  return result.join(',')
}

const deserialize = (data) => {
  if (!data) return null
  const vals = data.split(',')
  const root = new TreeNode(parseInt(vals[0]))
  const queue = [root]
  let i = 1
  while (queue.length && i < vals.length) {
    const node = queue.shift()
    if (vals[i] !== 'null') {
      node.left = new TreeNode(parseInt(vals[i]))
      queue.push(node.left)
    }
    i++
    if (i < vals.length && vals[i] !== 'null') {
      node.right = new TreeNode(parseInt(vals[i]))
      queue.push(node.right)
    }
    i++
  }
  return root
}

// DFS (preorder) approach — more compact
const serializeDFS = (root) => {
  function dfs(node) {
    if (!node) return ['null']
    return [String(node.val), ...dfs(node.left), ...dfs(node.right)]
  }
  return dfs(root).join(',')
}

const deserializeDFS = (data) => {
  const vals = data.split(',')
  let i = 0
  function dfs() {
    if (vals[i] === 'null') { i++; return null }
    const node = new TreeNode(parseInt(vals[i++]))
    node.left = dfs()
    node.right = dfs()
    return node
  }
  return dfs()
}
\`\`\`

**BFS Complexity:** O(n) serialize, O(n) deserialize
**Why BFS:** Output is human-readable level-order (matches LeetCode format)
**Why DFS:** Slightly smaller output (no trailing nulls), simpler code`
},

{
  category: 'CODING', difficulty: 'MEDIUM',
  q: 'Trapping Rain Water — stack approach and two-pointer approach.',
  whyAsked: 'Classic problem testing multiple approaches; tests spatial reasoning and stack usage.',
  a: `## Trapping Rain Water

### Approach 1: Two Pointers — O(n) time, O(1) space (best)
\`\`\`javascript
function trap(height) {
  let l = 0, r = height.length - 1
  let leftMax = 0, rightMax = 0, water = 0
  while (l < r) {
    if (height[l] <= height[r]) {
      if (height[l] >= leftMax) leftMax = height[l]
      else water += leftMax - height[l]
      l++
    } else {
      if (height[r] >= rightMax) rightMax = height[r]
      else water += rightMax - height[r]
      r--
    }
  }
  return water
}
\`\`\`

**Intuition:** Water at position i = min(maxLeft, maxRight) - height[i]. Process from the side with smaller max (guaranteed safe).

### Approach 2: Monotonic Stack — O(n) time, O(n) space
\`\`\`javascript
function trap(height) {
  const stack = []  // monotonically decreasing stack of indices
  let water = 0
  for (let i = 0; i < height.length; i++) {
    while (stack.length && height[stack[stack.length - 1]] < height[i]) {
      const bottom = stack.pop()
      if (!stack.length) break
      const width = i - stack[stack.length - 1] - 1
      const boundedHeight = Math.min(height[stack[stack.length - 1]], height[i]) - height[bottom]
      water += width * boundedHeight
    }
    stack.push(i)
  }
  return water
}
\`\`\`

**Intuition:** Stack stores indices in decreasing height order. When we find a taller bar, we can calculate trapped water in the "valley".

### Approach 3: Prefix/Suffix Arrays — O(n) time, O(n) space
\`\`\`javascript
function trap(height) {
  const n = height.length
  const leftMax = new Array(n).fill(0)
  const rightMax = new Array(n).fill(0)
  leftMax[0] = height[0]
  for (let i = 1; i < n; i++) leftMax[i] = Math.max(leftMax[i - 1], height[i])
  rightMax[n - 1] = height[n - 1]
  for (let i = n - 2; i >= 0; i--) rightMax[i] = Math.max(rightMax[i + 1], height[i])
  return height.reduce((sum, h, i) => sum + Math.min(leftMax[i], rightMax[i]) - h, 0)
}
\`\`\`

**Edge Cases:** Empty array, all same height, monotonically increasing/decreasing.`
},

{
  category: 'CODING', difficulty: 'MEDIUM',
  q: 'Top K Frequent Elements — heap approach and bucket sort.',
  whyAsked: 'Tests frequency counting, heap usage, and O(n) bucket sort alternative.',
  a: `## Top K Frequent Elements

### Approach 1: HashMap + Sorting — O(n log n)
\`\`\`javascript
function topKFrequent(nums, k) {
  const freq = new Map()
  for (const n of nums) freq.set(n, (freq.get(n) || 0) + 1)
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, k)
    .map(([num]) => num)
}
\`\`\`

### Approach 2: Bucket Sort — O(n) (optimal)
\`\`\`javascript
function topKFrequent(nums, k) {
  const freq = new Map()
  for (const n of nums) freq.set(n, (freq.get(n) || 0) + 1)

  // buckets[i] = list of numbers with frequency i
  const buckets = Array.from({ length: nums.length + 1 }, () => [])
  for (const [num, count] of freq.entries()) {
    buckets[count].push(num)
  }

  const result = []
  for (let i = buckets.length - 1; i >= 1 && result.length < k; i--) {
    for (const num of buckets[i]) {
      result.push(num)
      if (result.length === k) return result
    }
  }
  return result
}
\`\`\`
**Complexity:** O(n) | Space O(n)

### Approach 3: Min-Heap simulation with sorted array — O(n log k)
\`\`\`javascript
function topKFrequent(nums, k) {
  const freq = new Map()
  for (const n of nums) freq.set(n, (freq.get(n) || 0) + 1)

  // Keep a "heap" of size k by sorting unique elements
  const unique = [...freq.keys()]
  unique.sort((a, b) => freq.get(b) - freq.get(a))
  return unique.slice(0, k)
}
\`\`\`

**Interview tip:** Mention all approaches and trade-offs. Bucket sort is O(n) but needs O(n) space. For very large datasets with small k, a proper min-heap gives O(n log k) with less memory.`
},

{
  category: 'CODING', difficulty: 'HARD',
  q: 'Word Break Problem — DP and Trie approaches.',
  whyAsked: 'Tests dynamic programming on strings and understanding of Trie for dictionary lookup.',
  a: `## Word Break Problem

### Problem 1: Can the string be segmented? (LC 139)
\`\`\`javascript
function wordBreak(s, wordDict) {
  const wordSet = new Set(wordDict)
  const n = s.length
  const dp = new Array(n + 1).fill(false)
  dp[0] = true  // empty string

  for (let i = 1; i <= n; i++) {
    for (let j = 0; j < i; j++) {
      if (dp[j] && wordSet.has(s.slice(j, i))) {
        dp[i] = true
        break
      }
    }
  }
  return dp[n]
}
\`\`\`
**Complexity:** O(n² × m) where m = average word length | Space O(n)

**Optimization with maxLen:** Only check substrings of length ≤ max word length.
\`\`\`javascript
const maxLen = Math.max(...wordDict.map(w => w.length))
for (let i = 1; i <= n; i++) {
  for (let j = Math.max(0, i - maxLen); j < i; j++) {
    if (dp[j] && wordSet.has(s.slice(j, i))) { dp[i] = true; break }
  }
}
\`\`\`

### Problem 2: Return all valid sentences (LC 140)
\`\`\`javascript
function wordBreakII(s, wordDict) {
  const wordSet = new Set(wordDict)
  const memo = new Map()

  function dfs(start) {
    if (memo.has(start)) return memo.get(start)
    if (start === s.length) return ['']
    const sentences = []
    for (let end = start + 1; end <= s.length; end++) {
      const word = s.slice(start, end)
      if (wordSet.has(word)) {
        for (const rest of dfs(end)) {
          sentences.push(word + (rest ? ' ' + rest : ''))
        }
      }
    }
    memo.set(start, sentences)
    return sentences
  }

  return dfs(0)
}
\`\`\`

### Trie-based approach
\`\`\`javascript
class TrieNode {
  constructor() { this.children = {}; this.isEnd = false }
}

function buildTrie(words) {
  const root = new TrieNode()
  for (const w of words) {
    let node = root
    for (const c of w) {
      if (!node.children[c]) node.children[c] = new TrieNode()
      node = node.children[c]
    }
    node.isEnd = true
  }
  return root
}

function wordBreakTrie(s, wordDict) {
  const root = buildTrie(wordDict)
  const n = s.length
  const dp = new Array(n + 1).fill(false)
  dp[0] = true
  for (let i = 0; i < n; i++) {
    if (!dp[i]) continue
    let node = root
    for (let j = i; j < n; j++) {
      if (!node.children[s[j]]) break
      node = node.children[s[j]]
      if (node.isEnd) dp[j + 1] = true
    }
  }
  return dp[n]
}
\`\`\`
**Trie benefit:** Reduces repeated prefix checks; better when wordDict is large.`
},

// ─── System Design (8 more) ─────────────────────────────────────────────────
{
  category: 'SYSTEM_DESIGN', difficulty: 'MEDIUM',
  q: 'Design a Search Autocomplete System (like Google Search suggestions).',
  whyAsked: 'Tests Trie data structure, ranking, caching, and real-time distributed systems.',
  a: `## Search Autocomplete System

### Requirements
**Functional:** Return top-5 suggestions as user types; rank by frequency/recency; handle 100M queries/day.
**Non-Functional:** <100ms response, globally distributed, handle 10K queries/sec.

### Architecture
\`\`\`
User types → CDN Edge Cache → Autocomplete Service → Trie Service / Redis Cache
                                                   → Ranking Service
\`\`\`

### Data Structure: Trie (JavaScript Node.js)
\`\`\`javascript
class TrieNode {
  constructor() {
    this.children = {}
    this.topQueries = []  // pre-computed top-k for this prefix
  }
}

class AutocompleteSystem {
  constructor(sentences, times) {
    this.root = new TrieNode()
    this.freqMap = new Map()
    this.currentInput = ''
    sentences.forEach((s, i) => {
      this.freqMap.set(s, (this.freqMap.get(s) || 0) + times[i])
      this._insert(s)
    })
  }

  _insert(s) {
    let node = this.root
    for (const c of s) {
      if (!node.children[c]) node.children[c] = new TrieNode()
      node = node.children[c]
      // maintain sorted top-3 at each node
      if (!node.topQueries.includes(s)) node.topQueries.push(s)
      node.topQueries.sort((a, b) => {
        const diff = (this.freqMap.get(b) || 0) - (this.freqMap.get(a) || 0)
        return diff !== 0 ? diff : a.localeCompare(b)
      })
      if (node.topQueries.length > 3) node.topQueries.pop()
    }
  }

  input(c) {
    if (c === '#') {
      this.freqMap.set(this.currentInput, (this.freqMap.get(this.currentInput) || 0) + 1)
      this._insert(this.currentInput)
      this.currentInput = ''
      return []
    }
    this.currentInput += c
    let node = this.root
    for (const ch of this.currentInput) {
      if (!node.children[ch]) return []
      node = node.children[ch]
    }
    return node.topQueries
  }
}
\`\`\`

### At Scale: Distributed Approach
1. **Offline pipeline:** Process search logs (Kafka) → compute top-k per prefix → store in Redis
2. **Trie partitioned by first 2 chars** (e.g., "ap" → server group A)
3. **Cache layer:** Popular prefixes cached at CDN edge (80% hit rate for top-1000 prefixes)
4. **Ranking signals:** frequency × recency × personalization score

### Real-time Updates
- Search events → Kafka → stream processing (Spark Streaming) → update prefix frequencies
- Batch rebuild Trie every 30 minutes; hot-swap (no downtime)

### API Design
\`\`\`
GET /autocomplete?q=appl&limit=5&locale=en-IN
Response: { suggestions: ["apple", "application", "apply", "apple watch", "applet"] }
\`\`\`

### Optimizations
- **Prefix sharing:** Store only diffs from parent node (compressed Trie / Patricia Trie)
- **CDN caching:** Cache results for common prefixes at edge with 60s TTL
- **Personalization:** Blend global rankings with user's search history (last 7 days)`
},

{
  category: 'SYSTEM_DESIGN', difficulty: 'HARD',
  q: 'Design a Distributed Cache like Redis.',
  whyAsked: 'Tests consistent hashing, cache eviction policies, replication, and distributed systems fundamentals.',
  a: `## Distributed Cache Design

### Requirements
**Functional:** Get/Set/Delete with TTL, support multiple data structures (string, hash, list, set).
**Non-Functional:** <1ms latency, 99.999% availability, handle 1M ops/sec, horizontally scalable.

### Core Components

**1. Consistent Hashing (Key Distribution)**
\`\`\`
Hash Ring: 0 ─────────────────────── 2³²-1
              Node A    Node B    Node C
              (0-33%)  (33-66%) (66-100%)
\`\`\`
- Each cache node owns a range of the hash ring
- Adding/removing node only remaps ~1/n fraction of keys
- Virtual nodes (150 per physical node) for even distribution

**2. Cache Node Architecture (single node)**
\`\`\`
Client Request → Command Parser → Executor
                              → In-Memory Store (Hash Table)
                              → LRU Eviction Manager
                              → AOF/RDB Persistence (optional)
\`\`\`

**3. Eviction Policies**
| Policy | When to use |
|--------|------------|
| LRU | General purpose |
| LFU | Skewed access patterns |
| TTL-based | Time-sensitive data |
| allkeys-random | Approximate cache |

**4. Replication**
- Master-Replica: each master has 1-2 replicas
- Async replication (eventual consistency) for performance
- On master failure: replica promoted (Sentinel or Raft election)

**5. Cluster Communication (Gossip Protocol)**
\`\`\`
Each node knows state of all other nodes via gossip (O(log n) rounds)
Heartbeat every 100ms; node marked FAIL after 5s of no response
\`\`\`

### Write Path
\`\`\`
Client → Hash(key) → Find node via ring → Consistent Hash Router
       → Primary Node: write to memory + replicate async to replica
       → ACK to client
\`\`\`

### Hot Key Problem
- Key accessed by millions of requests/sec → single node bottleneck
- Solution: Local in-process cache in client library (bypass distributed cache for hot keys)
- Or: shard hot key → append random suffix (key_1, key_2, ...) and fan-out reads

### Persistence Options
- **RDB (snapshot):** Point-in-time dump every N minutes. Fast restore, some data loss.
- **AOF (append-only log):** Log every write command. Slower but near-zero data loss.
- **Hybrid:** AOF for recent writes + RDB for full backup.`
},

{
  category: 'SYSTEM_DESIGN', difficulty: 'HARD',
  q: 'Design a Content Delivery Network (CDN).',
  whyAsked: 'Tests understanding of global distribution, caching hierarchy, and origin-edge architecture.',
  a: `## Content Delivery Network (CDN) Design

### Requirements
**Functional:** Cache and serve static (images, JS, CSS, video) and dynamic content globally. Invalidate cache on content update.
**Non-Functional:** <50ms latency globally, 99.99% availability, handle petabytes of content.

### Architecture: Cache Hierarchy
\`\`\`
User → DNS (Anycast) → Nearest Edge PoP → Regional Cache → Origin Server
                                        ↑ L1 Cache (SSD)
                                   ↑ L2 Cache (HDD)
\`\`\`

### DNS-Based Routing (GeoDNS)
- Client DNS query → CDN's authoritative DNS checks client IP geolocation
- Returns IP of nearest healthy PoP (Point of Presence)
- Anycast: same IP announced from multiple locations; BGP routes to nearest

### Edge Node (PoP)
- L1 Cache: NVMe SSD, ~10TB, fastest hot content
- L2 Cache: HDD, ~100TB, warm content
- Cache key: URL + Vary headers (Accept-Encoding, Accept-Language)
- On miss: fetch from regional cache or origin, cache locally

### Cache Control
\`\`\`http
Cache-Control: public, max-age=86400, s-maxage=3600
CDN-Cache-Control: max-age=600   # CDN-specific TTL
Surrogate-Key: product-123       # tag-based invalidation
\`\`\`

### Cache Invalidation
1. **TTL expiry:** Simplest; stale content until TTL expires
2. **URL versioning:** \`/static/app.v2.js\` — change URL = instant invalidation
3. **Tag-based purge:** Tag assets with IDs (e.g., product-123). On update, purge all assets with that tag. Akamai/Fastly support this natively.
4. **API purge:** POST /purge with URL list → propagated to all edges within seconds

### Dynamic Content Acceleration
- **Origin Shield:** Regional cache layer between edges and origin — reduces origin load by 90%
- **TCP Pre-warming:** Keep connections open to origin (avoid TCP handshake per request)
- **Protocol:** HTTP/2 (multiplexing), QUIC/HTTP3 (no head-of-line blocking)

### Security
- DDoS protection at edge (absorb traffic before hitting origin)
- WAF (Web Application Firewall) at edge
- TLS termination at edge (no encrypted traffic to traverse CDN network)
- Token-based URL signing for private content`
},

{
  category: 'SYSTEM_DESIGN', difficulty: 'HARD',
  q: 'How would you design Google Docs — real-time collaborative editing?',
  whyAsked: 'Tests OT/CRDT algorithms, WebSocket architecture, and conflict resolution at scale.',
  a: `## Google Docs: Real-Time Collaborative Editing

### Requirements
**Functional:** Multiple users edit same document simultaneously, changes visible in real-time, offline editing with sync, revision history.
**Non-Functional:** <100ms propagation, conflict-free merging, 10M documents, 100 concurrent editors per doc.

### Core Problem: Conflict Resolution

**Operational Transformation (OT) — Google Docs' approach:**
- Transform operations against concurrent operations to maintain consistency
\`\`\`
User A: Insert "X" at position 5
User B (concurrent): Delete character at position 3

After B's delete, "Insert at position 5" must become "Insert at position 4"
OT transforms A's op relative to B's op
\`\`\`

**CRDT (Conflict-free Replicated Data Types) — Notion, Figma:**
- Each character has a unique ID and logical position
- No central coordination needed; operations always commute
- Higher memory overhead but simpler distributed model

### Architecture
\`\`\`
Client → WebSocket Gateway → Collaboration Service (OT Engine)
                          → Operation Queue (Kafka)
                          → Document Store (Firestore/DynamoDB)
                          → Revision History (append-only log)
\`\`\`

### Operation Flow
1. User types → client creates operation (Insert/Delete/Format + position + timestamp)
2. Operation sent via WebSocket to Collaboration Service
3. Server applies OT: transform op against all concurrent ops not yet seen by this client
4. Broadcast transformed op to all other connected clients
5. Persist to document store async

### Document Storage
- **CRDT document model:** List of characters with unique IDs
- **Snapshots:** Full document state every N operations (for fast load)
- **Operation log:** All operations since last snapshot (for reconstruction)

\`\`\`sql
documents: id, title, owner_id, created_at, updated_at
document_snapshots: doc_id, version, content, created_at
document_operations: id, doc_id, user_id, op_type, position, content, version, timestamp
\`\`\`

### Cursor & Presence
- Each client sends cursor position via WebSocket every 500ms
- Server broadcasts to other clients with user color + name overlay

### Offline Support
- Local ops queued in IndexedDB while offline
- On reconnect: fetch server ops since last known version, transform local ops, replay
- Awareness (Yjs library) handles this elegantly with CRDT`
},

{
  category: 'SYSTEM_DESIGN', difficulty: 'HARD',
  q: 'Design a Distributed Job Scheduler.',
  whyAsked: 'Tests distributed locking, cron scheduling, fault tolerance, and task queuing.',
  a: `## Distributed Job Scheduler

### Requirements
**Functional:** Schedule one-time and recurring (cron) jobs, execute at specified time, retry on failure, job history, priority support.
**Non-Functional:** Exactly-once execution guarantee, handle 1M jobs/day, <1s scheduling accuracy, fault tolerant.

### Architecture
\`\`\`
API → Job Store (DB) → Scheduler (leader-elected) → Job Queue (Kafka/Redis)
                                                  → Worker Pool
                                                  → Result Store
\`\`\`

### Core Components

**1. Job Store (PostgreSQL)**
\`\`\`sql
CREATE TABLE jobs (
  id BIGINT PRIMARY KEY,
  name VARCHAR, type ENUM('ONE_TIME', 'RECURRING'),
  cron_expression VARCHAR,   -- "0 9 * * MON-FRI"
  next_run_at TIMESTAMP,
  status ENUM('PENDING','RUNNING','DONE','FAILED'),
  payload JSON,
  retry_count INT DEFAULT 0, max_retries INT DEFAULT 3,
  priority INT DEFAULT 5,
  lock_token UUID,           -- for distributed locking
  locked_until TIMESTAMP
);
\`\`\`

**2. Distributed Locking (Exactly-Once)**
\`\`\`sql
-- Atomic lock acquisition (optimistic locking)
UPDATE jobs
SET status='RUNNING', lock_token=:token, locked_until=NOW() + INTERVAL 5 MINUTE
WHERE id=:id AND status='PENDING' AND (locked_until IS NULL OR locked_until < NOW())
\`\`\`

**3. Scheduler Service (Leader Election via Zookeeper)**
- Only ONE scheduler instance is active (leader)
- Leader polls DB every second for jobs where \`next_run_at <= NOW()\`
- Pushes due jobs to priority queue (Redis Sorted Set by next_run_at)

**4. Worker Nodes**
- Workers BRPOP from Redis queue (blocking pop)
- Execute job → update status
- On failure: retry with exponential backoff (30s, 5m, 1h)
- Dead letter queue after max retries exhausted

**5. Cron Expression Parsing**
\`\`\`javascript
const cron = require('node-cron')
// After job completes, compute next_run_at:
function nextRunAt(cronExpr) {
  // Use 'cron-parser' npm package
  const interval = CronParser.parseExpression(cronExpr)
  return interval.next().toDate()
}
\`\`\`

### Failure Handling
- Worker crashes mid-job → lock expires after 5 min → scheduler re-enqueues
- Scheduler crashes → ZooKeeper detects failure → replica becomes new leader
- DB down → workers drain Redis queue; scheduler pauses until DB recovers`
},

{
  category: 'SYSTEM_DESIGN', difficulty: 'HARD',
  q: 'Design a Social Media Feed (like Twitter/Instagram).',
  whyAsked: 'Tests fan-out on write vs read trade-offs, caching, and handling celebrity/non-celebrity users differently.',
  a: `## Social Media Feed Design

### Requirements
**Functional:** User sees posts from followed accounts in reverse-chronological (or ranked) order. Support likes, comments. Handle 500M users, 1M posts/day.
**Non-Functional:** Feed load <200ms, eventual consistency acceptable (1-2 second delay OK).

### Core Challenge: Fan-Out Strategy

**Option A: Fan-Out on Write (Push Model)**
- When User A posts → immediately write to all followers' feed caches
- Read is O(1): just read your feed cache
- Problem: Celebrity with 50M followers → 50M writes on each post

**Option B: Fan-Out on Read (Pull Model)**
- Read feed: fetch posts from all followed users and merge
- No write amplification
- Problem: If you follow 5000 people → 5000 DB reads per feed load

**Option C: Hybrid (Twitter's approach)**
- Regular users (<10K followers): fan-out on write → store in feed cache
- Celebrities (>10K followers): fan-out on read → pull separately and merge at read time
- On feed load: cached_feed + celebrity_posts merged and sorted

### Architecture
\`\`\`
Post Service → Fan-out Service → Feed Cache (Redis per user)
                              → Async workers (for large follower counts)
Feed Service → Redis (cached feed) + Celebrity pull → Merged feed
\`\`\`

### Feed Cache (Redis)
\`\`\`
Key: feed:{userId}
Value: Sorted Set — score=timestamp, member=postId
Limit: keep only latest 800 posts in cache; older posts fetched from DB
\`\`\`

### Ranking
- Weighted score: recency × engagement_rate × relationship_strength
- ML model recalculates rankings periodically (every 15 min)
- For real-time: latest posts get temporary boost for first 2 hours

### Storage
\`\`\`sql
posts: id, user_id, content, media_url, created_at, like_count, comment_count
follows: follower_id, followee_id, created_at
post_likes: post_id, user_id, created_at (or Redis HyperLogLog for approximate)
\`\`\``
},

{
  category: 'SYSTEM_DESIGN', difficulty: 'HARD',
  q: 'Design a File Storage System like Dropbox or Google Drive.',
  whyAsked: 'Tests chunked upload, deduplication, sync protocols, and metadata vs blob storage separation.',
  a: `## File Storage System Design

### Requirements
**Functional:** Upload/download files up to 50GB, folder structure, sharing with permissions, version history, sync across devices.
**Non-Functional:** 500M users, 1 exabyte storage, <1s small file upload, 99.99% durability.

### Architecture
\`\`\`
Client SDK → API Gateway → Metadata Service (PostgreSQL)
                        → Chunk Service → Object Storage (S3)
                        → Sync Service (delta sync)
                        → Notification Service
\`\`\`

### Chunked Upload (Critical for Large Files)
1. Client splits file into 4MB chunks
2. Compute SHA-256 hash of each chunk
3. Upload each chunk independently (parallel, resumable)
4. Server assembles chunks once all received
5. On network failure: only re-upload missing chunks

\`\`\`javascript
// Client-side chunking (Node.js)
const CHUNK_SIZE = 4 * 1024 * 1024  // 4MB
const fs = require('fs')
const crypto = require('crypto')

async function uploadFile(filePath) {
  const chunks = []
  const stream = fs.createReadStream(filePath, { highWaterMark: CHUNK_SIZE })
  for await (const chunk of stream) {
    const hash = crypto.createHash('sha256').update(chunk).digest('hex')
    await uploadChunk(chunk, hash)
    chunks.push(hash)
  }
  await finalizeUpload(chunks, getMetadata(filePath))
}
\`\`\`

### Deduplication
- Same chunk uploaded by different users → store only once (content-addressable storage)
- Key: SHA-256(chunk_content) → S3 path
- Saves ~30% storage in practice

### Metadata Storage
\`\`\`sql
files: id, owner_id, name, size, mime_type, version, parent_folder_id, created_at
chunks: hash VARCHAR(64) PRIMARY KEY, s3_path, size
file_chunks: file_id, chunk_hash, chunk_order
file_versions: file_id, version, chunk_list, created_at
shares: file_id, shared_with_user_id, permission (READ/WRITE)
\`\`\`

### Sync Protocol (Delta Sync)
1. Client maintains local state (file hash + last_modified)
2. On startup: send local state to Sync Service
3. Server computes diff → sends only changed chunks
4. Client applies changes, updates local state

### Storage Optimization
- Small files (<100KB): store directly in metadata DB (avoid S3 overhead)
- Compression: gzip for text files before storing
- Cold storage: files not accessed in 90 days → move to S3 Glacier`
},

{
  category: 'SYSTEM_DESIGN', difficulty: 'HARD',
  q: 'How would you design a Distributed ID Generator (like Twitter Snowflake)?',
  whyAsked: 'Tests distributed systems, bit manipulation, and unique ID generation at scale.',
  a: `## Distributed ID Generator

### Requirements
- Globally unique IDs, no coordination needed between nodes
- Sortable by time (newer IDs > older IDs)
- Generate 100K IDs/sec per node
- 64-bit integer (fits in a long)

### Options Compared

| Approach | Pros | Cons |
|----------|------|------|
| UUID v4 | Simple, no coordination | Not sortable, 128-bit, not DB-friendly |
| DB auto-increment | Simple | Single point of failure, not distributed |
| Redis INCR | Fast | Network hop, SPOF |
| Snowflake | Distributed, sortable, fast | Clock drift issues |

### Twitter Snowflake Layout (64-bit)
\`\`\`
┌─────────────────────┬──────────────┬──────────────┐
│   41 bits           │   10 bits    │   12 bits    │
│   Timestamp (ms)    │  Machine ID  │  Sequence    │
│   (custom epoch)    │  (0-1023)   │   (0-4095)   │
└─────────────────────┴──────────────┴──────────────┘
1 bit unused (sign bit, always 0 for positive IDs)
\`\`\`

### Implementation (Node.js)
\`\`\`javascript
class SnowflakeGenerator {
  static EPOCH = 1609459200000n  // 2021-01-01 00:00:00 UTC in ms (BigInt)
  static MACHINE_BITS = 10n
  static SEQUENCE_BITS = 12n
  static MAX_SEQUENCE = (1n << 12n) - 1n  // 4095

  constructor(machineId) {
    this.machineId = BigInt(machineId)
    this.sequence = 0n
    this.lastTimestamp = -1n
  }

  generate() {
    let ts = BigInt(Date.now()) - SnowflakeGenerator.EPOCH
    if (ts === this.lastTimestamp) {
      this.sequence = (this.sequence + 1n) & SnowflakeGenerator.MAX_SEQUENCE
      if (this.sequence === 0n) {
        // sequence exhausted; wait for next millisecond
        while (ts <= this.lastTimestamp) {
          ts = BigInt(Date.now()) - SnowflakeGenerator.EPOCH
        }
      }
    } else {
      this.sequence = 0n
    }
    this.lastTimestamp = ts
    return (ts << 22n) | (this.machineId << 12n) | this.sequence
  }
}

// Usage
const gen = new SnowflakeGenerator(1)
console.log(gen.generate().toString())  // e.g. "6984582786641920"
\`\`\`

### Capacity
- 41 bits timestamp: ~69 years from epoch
- 10 bits machine: 1024 nodes
- 12 bits sequence: 4096 IDs/ms/node = **4M IDs/sec/node**

### Clock Drift Problem
- NTP can move clock backwards → duplicate IDs
- Solutions:
  1. Wait until \`current_time > last_timestamp\` before generating
  2. Refuse to generate if clock goes backwards by >2ms (raise alert)
  3. Use logical clocks instead of wall clock

### Machine ID Assignment
- Zookeeper: each node registers and gets a unique ID on startup
- Pre-assigned: embed machine ID in deployment config (simpler, no coordination)`
},

// ─── JavaScript / TypeScript ─────────────────────────────────────────────────
{
  category: 'TECHNICAL', difficulty: 'MEDIUM',
  q: 'How does event delegation work in JavaScript? Why is it efficient?',
  whyAsked: 'Tests DOM event bubbling understanding and performance optimization techniques.',
  a: `## Event Delegation

**Concept:** Instead of attaching event listeners to each child element, attach ONE listener to the parent. Events bubble up from child → parent, so the parent can handle them.

### Without Delegation (inefficient)
\`\`\`javascript
// 1000 list items = 1000 event listeners
document.querySelectorAll('li').forEach(li => {
  li.addEventListener('click', handleClick)
})
\`\`\`

### With Delegation (efficient)
\`\`\`javascript
// 1 event listener on parent handles all children
document.getElementById('list').addEventListener('click', (e) => {
  const li = e.target.closest('li')  // find clicked li
  if (!li) return
  console.log('Clicked:', li.textContent)
})
\`\`\`

### Why Efficient?
1. **Memory:** 1 listener vs N listeners (N can be thousands)
2. **Dynamic elements:** New children added after page load are handled automatically — no need to re-attach listeners
3. **Setup performance:** No need to iterate all elements on mount

### How Event Bubbling Works
\`\`\`
Click on <button> inside <li> inside <ul>:
  button → li → ul → div → body → html → document → window
Each ancestor's click listener fires (unless stopPropagation() called)
\`\`\`

### Real-World Example: Table with 10K rows
\`\`\`javascript
table.addEventListener('click', (e) => {
  const row = e.target.closest('tr[data-id]')
  if (!row) return
  const id = row.dataset.id
  // handle row click
})
\`\`\`

### stopPropagation vs preventDefault
- \`e.stopPropagation()\` — stops bubbling (no parent listeners fire)
- \`e.preventDefault()\` — cancels default browser action (e.g., form submit, link navigation)
- \`e.stopImmediatePropagation()\` — stops bubbling AND prevents other listeners on same element`
},

{
  category: 'TECHNICAL', difficulty: 'MEDIUM',
  q: 'Explain let vs const vs var — hoisting, TDZ, and scoping.',
  whyAsked: 'Fundamental JS knowledge; tests understanding of scoping rules and the Temporal Dead Zone.',
  a: `## let vs const vs var

### Scoping
\`\`\`javascript
// var — function-scoped (or global if outside function)
function foo() {
  if (true) { var x = 1 }
  console.log(x)  // 1 — accessible outside if block!
}

// let / const — block-scoped
function bar() {
  if (true) { let y = 1; const z = 2 }
  console.log(y)  // ReferenceError: y is not defined
}
\`\`\`

### Hoisting
\`\`\`javascript
// var: hoisted AND initialized to undefined
console.log(a)  // undefined (no error)
var a = 5

// let/const: hoisted but NOT initialized → Temporal Dead Zone (TDZ)
console.log(b)  // ReferenceError: Cannot access 'b' before initialization
let b = 5
\`\`\`

### Temporal Dead Zone (TDZ)
The TDZ is the zone between entering scope and the let/const declaration line.
\`\`\`javascript
{
  // TDZ for 'x' starts here
  console.log(x)  // ReferenceError (in TDZ)
  let x = 10      // TDZ ends here
  console.log(x)  // 10
}
\`\`\`

### const — not truly immutable
\`\`\`javascript
const arr = [1, 2, 3]
arr.push(4)       // OK! — arr still points to same array
arr = [1, 2, 3, 4]  // TypeError: Assignment to constant variable

const obj = { a: 1 }
obj.a = 2         // OK! — mutation allowed
obj = {}          // TypeError
\`\`\`

### Classic Interview Trap
\`\`\`javascript
// var in loop — all share same variable
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 100)  // prints 3 3 3
}

// let in loop — each iteration gets its own scope
for (let i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 100)  // prints 0 1 2
}
\`\`\`

### Rules of Thumb
- Always use **const** by default
- Use **let** when you need to reassign
- Never use **var** in modern code`
},

{
  category: 'TECHNICAL', difficulty: 'HARD',
  q: 'How does the JavaScript Event Loop work? Explain microtasks vs macrotasks.',
  whyAsked: 'Core async understanding; tests ability to predict execution order in async code.',
  a: `## JavaScript Event Loop

### Single-Threaded but Non-Blocking
JavaScript has ONE call stack. Long operations (I/O, timers) are offloaded to Web APIs, which put callbacks into queues when done. The Event Loop picks from queues when the call stack is empty.

### Queue Priority (high to low)
\`\`\`
Call Stack → (empty?) → Microtask Queue → Macrotask Queue
\`\`\`

**Microtasks** (run ALL before next macrotask):
- \`Promise.then/catch/finally\`
- \`queueMicrotask()\`
- MutationObserver callbacks

**Macrotasks** (one per loop iteration):
- \`setTimeout\`, \`setInterval\`
- \`setImmediate\` (Node.js)
- I/O callbacks
- UI rendering

### Execution Order Example
\`\`\`javascript
console.log('1')

setTimeout(() => console.log('2'), 0)  // macrotask

Promise.resolve().then(() => console.log('3'))  // microtask

console.log('4')

// Output: 1 → 4 → 3 → 2
// Why? Sync first (1, 4), then microtasks (3), then macrotasks (2)
\`\`\`

### Complex Example
\`\`\`javascript
console.log('start')

setTimeout(() => {
  console.log('timeout 1')
  Promise.resolve().then(() => console.log('promise in timeout'))
}, 0)

Promise.resolve()
  .then(() => {
    console.log('promise 1')
    return Promise.resolve()
  })
  .then(() => console.log('promise 2'))

console.log('end')

// Output:
// start
// end
// promise 1
// promise 2
// timeout 1
// promise in timeout
\`\`\`

### Node.js Event Loop (6 phases)
\`\`\`
timers → pending callbacks → idle/prepare → poll → check → close callbacks
                                                    ↑
                                              setImmediate runs here
\`\`\`
- \`process.nextTick\` runs before any phase (before even Promises!)
- \`setImmediate\` runs in check phase (after I/O)
- \`setTimeout(fn, 0)\` runs in timers phase`
},

{
  category: 'TECHNICAL', difficulty: 'HARD',
  q: 'Explain JavaScript closures with practical examples.',
  whyAsked: 'Closures underpin module patterns, memoization, event handlers, and currying.',
  a: `## JavaScript Closures

**Definition:** A closure is a function that "remembers" variables from its outer (enclosing) scope even after that outer scope has finished executing.

### Basic Example
\`\`\`javascript
function makeCounter() {
  let count = 0  // this variable is "closed over"
  return function() {
    count++
    return count
  }
}

const counter = makeCounter()
counter()  // 1
counter()  // 2
counter()  // 3
// count is private — not accessible from outside
\`\`\`

### Practical Use 1: Module Pattern (private state)
\`\`\`javascript
function createBankAccount(initialBalance) {
  let balance = initialBalance  // private

  return {
    deposit(amount) { balance += amount },
    withdraw(amount) {
      if (amount > balance) throw new Error('Insufficient funds')
      balance -= amount
    },
    getBalance() { return balance }
  }
}

const account = createBankAccount(100)
account.deposit(50)
account.getBalance()  // 150
// balance is inaccessible directly
\`\`\`

### Practical Use 2: Memoization
\`\`\`javascript
function memoize(fn) {
  const cache = new Map()  // closed over
  return function(...args) {
    const key = JSON.stringify(args)
    if (cache.has(key)) return cache.get(key)
    const result = fn.apply(this, args)
    cache.set(key, result)
    return result
  }
}

const fibonacci = memoize(function fib(n) {
  if (n <= 1) return n
  return fibonacci(n - 1) + fibonacci(n - 2)
})
\`\`\`

### Practical Use 3: Currying / Partial Application
\`\`\`javascript
function multiply(a) {
  return function(b) {
    return a * b  // a is closed over
  }
}

const double = multiply(2)
const triple = multiply(3)
double(5)  // 10
triple(5)  // 15
\`\`\`

### Classic Closure Trap
\`\`\`javascript
// var — all closures share same variable
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 1000)  // 3 3 3
}

// Fix 1: use let (block scope per iteration)
for (let i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 1000)  // 0 1 2
}

// Fix 2: IIFE (old-school closure solution)
for (var i = 0; i < 3; i++) {
  (function(j) {
    setTimeout(() => console.log(j), 1000)  // 0 1 2
  })(i)
}
\`\`\``
},

{
  category: 'TECHNICAL', difficulty: 'HARD',
  q: 'async/await vs Promises — how do they relate and when to prefer each?',
  whyAsked: 'Tests async JavaScript mastery, error handling patterns, and understanding of syntactic sugar.',
  a: `## async/await vs Promises

### async/await IS Promises
async/await is syntactic sugar over Promises — it compiles to the same underlying Promise chains.
\`\`\`javascript
// These are equivalent:
function fetchUser(id) {
  return fetch(\`/api/users/\${id}\`)
    .then(res => res.json())
    .then(data => data.user)
    .catch(err => console.error(err))
}

async function fetchUser(id) {
  try {
    const res = await fetch(\`/api/users/\${id}\`)
    const data = await res.json()
    return data.user
  } catch (err) {
    console.error(err)
  }
}
\`\`\`

### When to prefer Promises
\`\`\`javascript
// Parallel execution — Promise.all is cleaner
async function loadDashboard(userId) {
  const [user, posts, notifications] = await Promise.all([
    fetchUser(userId),
    fetchPosts(userId),
    fetchNotifications(userId)
  ])
  return { user, posts, notifications }
}

// Chain with transform — .then() can be cleaner
const result = fetch('/api/data')
  .then(res => res.json())
  .then(data => data.filter(x => x.active))
  .then(active => active.map(x => x.id))
\`\`\`

### When to prefer async/await
\`\`\`javascript
// Sequential dependent async operations — cleaner with await
async function transferMoney(from, to, amount) {
  const sender = await getAccount(from)     // need sender first
  if (sender.balance < amount) throw new Error('Insufficient')
  await debit(from, amount)                  // need to debit before credit
  await credit(to, amount)
  await logTransaction(from, to, amount)
}

// Complex error handling
async function robustFetch(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fetch(url).then(r => r.json())
    } catch (err) {
      if (i === retries - 1) throw err
      await new Promise(r => setTimeout(r, 1000 * 2 ** i))  // exponential backoff
    }
  }
}
\`\`\`

### Common Mistakes
\`\`\`javascript
// ❌ Sequential when parallel possible (slow)
const user = await fetchUser(id)
const posts = await fetchPosts(id)  // waits unnecessarily

// ✅ Parallel
const [user, posts] = await Promise.all([fetchUser(id), fetchPosts(id)])

// ❌ Forgetting await (fire-and-forget)
async function save() {
  saveToDb(data)  // not awaited — errors silently dropped
}

// ❌ await in forEach (doesn't wait)
items.forEach(async (item) => await process(item))  // all run concurrently, loop doesn't wait

// ✅ Use for...of for sequential or Promise.all for parallel
for (const item of items) await process(item)
await Promise.all(items.map(item => process(item)))
\`\`\``
},

{
  category: 'TECHNICAL', difficulty: 'MEDIUM',
  q: 'Explain deep copy vs shallow copy in JavaScript.',
  whyAsked: 'Tests understanding of reference vs value semantics — a common source of bugs.',
  a: `## Deep Copy vs Shallow Copy

### Shallow Copy — copies top-level only
\`\`\`javascript
const original = { a: 1, b: { c: 2 } }

// Spread operator — shallow copy
const shallow1 = { ...original }
// Object.assign — shallow copy
const shallow2 = Object.assign({}, original)

shallow1.a = 99           // OK — doesn't affect original
shallow1.b.c = 99         // ❌ Mutates original.b.c too! (shared reference)
console.log(original.b.c) // 99
\`\`\`

### Deep Copy — copies all nested levels
\`\`\`javascript
const original = { a: 1, b: { c: 2 }, arr: [1, 2, 3] }

// Method 1: JSON.parse/stringify (simple but limited)
const deep1 = JSON.parse(JSON.stringify(original))
// Limitations: loses undefined, functions, Date, RegExp, circular refs

// Method 2: structuredClone (modern, handles most types)
const deep2 = structuredClone(original)
// Handles: Date, RegExp, Map, Set, ArrayBuffer, circular references
// Doesn't handle: functions, DOM nodes, class instances with methods

// Method 3: lodash.cloneDeep (most comprehensive)
import _ from 'lodash'
const deep3 = _.cloneDeep(original)
\`\`\`

### Array copy methods
\`\`\`javascript
const arr = [1, [2, 3], { a: 4 }]

// Shallow copies
const s1 = [...arr]
const s2 = arr.slice()
const s3 = Array.from(arr)

s1[1].push(99)  // ❌ Mutates original nested array

// Deep copy
const deep = structuredClone(arr)
deep[1].push(99)  // ✅ Doesn't affect original
\`\`\`

### Custom recursive deep clone
\`\`\`javascript
function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') return obj
  if (obj instanceof Date) return new Date(obj)
  if (obj instanceof Array) return obj.map(item => deepClone(item))
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [k, deepClone(v)])
  )
}
\`\`\`

### When to use what
- Reading only → shallow copy is fine (no mutation)
- Mutating nested data → deep copy required
- Large objects → avoid JSON round-trip (slow); use structuredClone`
},

{
  category: 'TECHNICAL', difficulty: 'HARD',
  q: 'What are WeakMap and WeakSet? When would you use them?',
  whyAsked: 'Tests understanding of JavaScript memory model and garbage collection.',
  a: `## WeakMap and WeakSet

### WeakMap
A Map where **keys must be objects** and are held **weakly** — if no other reference to the key exists, it can be garbage collected (and its entry disappears from the WeakMap).
\`\`\`javascript
const wm = new WeakMap()
let obj = { name: 'Alice' }
wm.set(obj, { metadata: 'some data' })

// When obj is garbage collected, wm entry is automatically removed
obj = null  // now eligible for GC; WeakMap entry disappears too

// Only .get(), .set(), .has(), .delete() — no .size, no iteration
\`\`\`

### WeakSet
A Set where **values must be objects** and are held weakly.
\`\`\`javascript
const ws = new WeakSet()
let elem = document.getElementById('btn')
ws.add(elem)
ws.has(elem)  // true

elem = null  // element removed from DOM → GC → ws entry auto-removed
\`\`\`

### Use Case 1: Private data for objects
\`\`\`javascript
// Simulating private fields before # syntax
const _private = new WeakMap()

class Person {
  constructor(name, age) {
    _private.set(this, { age })  // private data keyed by instance
    this.name = name
  }
  getAge() { return _private.get(this).age }
}

const p = new Person('Alice', 30)
p.getAge()  // 30
// p.age is undefined — true private
\`\`\`

### Use Case 2: Caching without memory leaks
\`\`\`javascript
const cache = new WeakMap()

function processElement(el) {
  if (cache.has(el)) return cache.get(el)
  const result = expensiveComputation(el)
  cache.set(el, result)
  return result
}
// When DOM element is removed and GC'd, cache entry auto-deleted
// With a regular Map, removed elements would accumulate — memory leak!
\`\`\`

### Use Case 3: Tracking visited nodes in graph algorithms
\`\`\`javascript
function hasCircle(node) {
  const visited = new WeakSet()
  function dfs(n) {
    if (visited.has(n)) return true
    visited.add(n)
    return n.children.some(dfs)
  }
  return dfs(node)
}
// nodes GC'd after algorithm — no lingering references
\`\`\`

### Regular Map/Set vs Weak versions
| Feature | Map/Set | WeakMap/WeakSet |
|---------|---------|-----------------|
| Key/value types | Any | Objects only |
| Prevents GC | ✅ Yes | ❌ No (weak refs) |
| Iterable | ✅ Yes | ❌ No |
| .size | ✅ Yes | ❌ No |
| Use when | General purpose | Avoid memory leaks |`
},

// ─── React / Next.js ─────────────────────────────────────────────────────────
{
  category: 'TECHNICAL', difficulty: 'MEDIUM',
  q: 'What causes a React component to re-render?',
  whyAsked: 'Core React performance knowledge; understanding re-renders is key to avoiding unnecessary work.',
  a: `## What Causes React Re-renders

### 4 Triggers for Re-renders

**1. State change**
\`\`\`jsx
const [count, setCount] = useState(0)
// Calling setCount triggers re-render of this component + children
<button onClick={() => setCount(c => c + 1)}>+</button>
\`\`\`

**2. Props change**
\`\`\`jsx
function Child({ value }) {
  return <div>{value}</div>
}
// Child re-renders whenever parent passes new value prop
\`\`\`

**3. Context change**
\`\`\`jsx
const ThemeContext = createContext()
// ALL consumers re-render when context value changes
// Even if they don't use the changed part of context
\`\`\`

**4. Parent re-renders (cascades down)**
\`\`\`jsx
function Parent() {
  const [x, setX] = useState(0)
  return <Child />  // Child re-renders whenever Parent re-renders
}
// Even if Child doesn't receive x as a prop!
\`\`\`

### Preventing Unnecessary Re-renders

**React.memo** — skips re-render if props unchanged (shallow comparison)
\`\`\`jsx
const Child = React.memo(function Child({ value }) {
  return <div>{value}</div>
})
// Only re-renders when value actually changes
\`\`\`

**useMemo** — memoize expensive computed values
\`\`\`jsx
const sorted = useMemo(() => items.sort(compareFn), [items])
// Only recomputes when items changes
\`\`\`

**useCallback** — memoize functions so they don't change reference
\`\`\`jsx
const handleClick = useCallback(() => {
  doSomething(id)
}, [id])  // same function reference unless id changes
// Critical when passing callbacks to React.memo children
\`\`\`

### Common Mistake: Object/array literals in JSX
\`\`\`jsx
// ❌ New object on every render → Child always re-renders
<Child style={{ color: 'red' }} />

// ✅ Define outside or useMemo
const style = { color: 'red' }  // module level — stable reference
<Child style={style} />
\`\`\`

### Checking re-renders
Use React DevTools Profiler to highlight components that re-render. In development, add \`console.log\` in the component body to count renders.`
},

{
  category: 'TECHNICAL', difficulty: 'HARD',
  q: 'What is React Fiber? How does the reconciler work?',
  whyAsked: 'Deep React internals — shows you understand what React actually does under the hood.',
  a: `## React Fiber

### What is Fiber?
Fiber is React's internal reconciliation algorithm (reimplemented in React 16). It represents each component as a "fiber node" — a JavaScript object that tracks work to be done.

### Before Fiber (React ≤15): Stack Reconciler
- Rendering was recursive and synchronous
- Once started, couldn't be interrupted
- Long renders blocked UI updates → janky animations

### Fiber's Key Innovation: Incremental Rendering
Work is split into units (fibers). React can:
- **Pause** work between fibers
- **Resume** it later
- **Abort** if something more urgent comes in (e.g., user input)
- **Reuse** previously completed work

### How Reconciliation Works (Simplified)

**Phase 1: Render (Reconcile) — Interruptible**
\`\`\`
Build "work-in-progress" fiber tree by comparing new VDOM with current tree.
Mark each fiber with an effect tag: PLACEMENT | UPDATE | DELETION
This phase can be paused/resumed/aborted.
\`\`\`

**Phase 2: Commit — Synchronous (cannot be interrupted)**
\`\`\`
Walk the effect list.
Apply DOM mutations (insertBefore, removeChild, textContent update, etc.)
Run useLayoutEffect, ref callbacks.
Schedule useEffect.
\`\`\`

### Fiber Node (simplified)
\`\`\`javascript
const fiber = {
  type: MyComponent,        // component type
  key: null,
  stateNode: domNode,       // actual DOM node or class instance
  child: childFiber,        // first child
  sibling: siblingFiber,    // next sibling
  return: parentFiber,      // parent
  pendingProps: {},          // new props
  memoizedProps: {},         // committed props
  memoizedState: hooksList,  // current hooks state
  effectTag: 'UPDATE',       // what needs to happen
  alternate: currentFiber,   // pointer to current committed fiber
}
\`\`\`

### Concurrent Features (React 18+)
Built on Fiber's interruptibility:
- \`useTransition\` — mark state updates as non-urgent (can be interrupted)
- \`useDeferredValue\` — defer expensive renders
- Streaming SSR — send HTML in chunks as components resolve`
},

{
  category: 'TECHNICAL', difficulty: 'HARD',
  q: 'useEffect vs useLayoutEffect — what is the difference?',
  whyAsked: 'Tests understanding of the render cycle and when DOM reads/writes should happen.',
  a: `## useEffect vs useLayoutEffect

### Timing Difference
\`\`\`
Render → React updates DOM → useLayoutEffect runs → Browser paints → useEffect runs
                             ↑ synchronous           ↑ async (after paint)
\`\`\`

### useEffect (most common)
- Runs **after** the browser has painted
- Non-blocking — doesn't delay the visual update
- For: data fetching, subscriptions, logging, analytics

\`\`\`jsx
useEffect(() => {
  // Runs after paint — safe for async work
  fetchData().then(setData)
  return () => cleanup()  // runs on unmount or before next effect
}, [dependency])
\`\`\`

### useLayoutEffect
- Runs **synchronously after DOM mutations but before browser paint**
- Blocks paint until it completes — use sparingly
- For: reading/writing DOM layout (getBoundingClientRect, scroll position, animations)

\`\`\`jsx
useLayoutEffect(() => {
  // Runs BEFORE browser paints — safe to read/write DOM layout
  const { height } = ref.current.getBoundingClientRect()
  setHeight(height)
  // If you did this in useEffect, user would see a flash
}, [])
\`\`\`

### Visual Flash Problem (why useLayoutEffect exists)
\`\`\`jsx
// ❌ useEffect — causes flash
function Tooltip({ text }) {
  const [pos, setPos] = useState({ top: 0 })
  const ref = useRef()

  useEffect(() => {
    // Runs AFTER paint — tooltip renders at (0,0), then jumps to correct position
    const rect = ref.current.getBoundingClientRect()
    setPos({ top: rect.bottom })
  }, [])

  return <div ref={ref} style={pos}>{text}</div>
}

// ✅ useLayoutEffect — no flash
  useLayoutEffect(() => {
    // Runs BEFORE paint — position set before user sees anything
    const rect = ref.current.getBoundingClientRect()
    setPos({ top: rect.bottom })
  }, [])
\`\`\`

### SSR Caveat
\`\`\`
useLayoutEffect has no effect on the server (no DOM).
React warns: "useLayoutEffect does nothing on the server"
Fix: Use useEffect for SSR-compatible code, or guard with:
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect
\`\`\``
},

{
  category: 'TECHNICAL', difficulty: 'MEDIUM',
  q: 'useState vs useReducer — when to use each?',
  whyAsked: 'Tests state management thinking and when patterns should evolve from simple to structured.',
  a: `## useState vs useReducer

### useState — simple, independent values
\`\`\`jsx
const [count, setCount] = useState(0)
const [name, setName] = useState('')
const [isOpen, setIsOpen] = useState(false)

// Direct update
setCount(c => c + 1)
setName('Alice')
\`\`\`

### useReducer — complex state with multiple transitions
\`\`\`jsx
const initialState = { status: 'idle', data: null, error: null }

function reducer(state, action) {
  switch (action.type) {
    case 'FETCH_START': return { ...state, status: 'loading', error: null }
    case 'FETCH_SUCCESS': return { status: 'success', data: action.payload, error: null }
    case 'FETCH_ERROR': return { ...state, status: 'error', error: action.error }
    case 'RESET': return initialState
    default: return state
  }
}

function UserProfile({ id }) {
  const [state, dispatch] = useReducer(reducer, initialState)

  useEffect(() => {
    dispatch({ type: 'FETCH_START' })
    fetchUser(id)
      .then(data => dispatch({ type: 'FETCH_SUCCESS', payload: data }))
      .catch(err => dispatch({ type: 'FETCH_ERROR', error: err.message }))
  }, [id])

  if (state.status === 'loading') return <Spinner />
  if (state.status === 'error') return <Error msg={state.error} />
  return <Profile data={state.data} />
}
\`\`\`

### When to prefer useReducer
- State has 3+ related values that change together
- Next state depends on previous state in complex ways
- Multiple actions trigger different state transitions
- Easier to test (pure function: state + action → state)
- Logic needs to be shared across components (extract reducer)

### Combining with Context (Redux-lite)
\`\`\`jsx
const StateContext = createContext()
const DispatchContext = createContext()

function AppProvider({ children }) {
  const [state, dispatch] = useReducer(rootReducer, initialState)
  return (
    <StateContext.Provider value={state}>
      <DispatchContext.Provider value={dispatch}>
        {children}
      </DispatchContext.Provider>
    </StateContext.Provider>
  )
}
// Separating state and dispatch contexts: components that only dispatch
// won't re-render when state changes
\`\`\``
},

{
  category: 'TECHNICAL', difficulty: 'HARD',
  q: 'Why does calling setState inside useEffect cause an infinite loop, and how do you fix it?',
  whyAsked: 'Common React bug; tests understanding of effect dependencies and React\'s render cycle.',
  a: `## setState Inside useEffect Infinite Loop

### Why It Happens
\`\`\`jsx
function Component() {
  const [count, setCount] = useState(0)

  useEffect(() => {
    setCount(count + 1)  // 1. setState triggers re-render
  })                      // 2. No dependency array → runs after EVERY render
                          // 3. Re-render triggers effect again → infinite loop
}
\`\`\`

**Cycle:** render → effect runs → setState → re-render → effect runs → setState → ...

### Fix 1: Add proper dependency array
\`\`\`jsx
useEffect(() => {
  setCount(count + 1)
}, [])  // Empty array = run only on mount (once)
\`\`\`

### Fix 2: Use functional update (if new state depends on old state)
\`\`\`jsx
useEffect(() => {
  // Don't include count in deps — use functional form instead
  setCount(prev => prev + 1)
}, [someOtherDep])
\`\`\`

### Fix 3: Use ref to track without triggering re-render
\`\`\`jsx
const hasRun = useRef(false)
useEffect(() => {
  if (hasRun.current) return
  hasRun.current = true
  setCount(count + 1)
}, [count])
\`\`\`

### Real-World: Object/function in deps causes infinite loop
\`\`\`jsx
// ❌ Infinite loop — options is new object on every render
function Component({ userId }) {
  const options = { userId, limit: 10 }  // new reference each render

  useEffect(() => {
    fetchData(options).then(setData)
  }, [options])  // options always "changed" → infinite fetch
}

// ✅ Fix 1: Destructure primitives
useEffect(() => {
  fetchData({ userId, limit: 10 }).then(setData)
}, [userId])  // stable primitive

// ✅ Fix 2: useMemo for object deps
const options = useMemo(() => ({ userId, limit: 10 }), [userId])
useEffect(() => {
  fetchData(options).then(setData)
}, [options])
\`\`\`

### React 18 StrictMode Double-Invocation
In React 18 StrictMode (dev only), effects run twice to detect cleanup issues. This can expose hidden infinite loops. The solution is always the same: correct dependency arrays.`
},

{
  category: 'TECHNICAL', difficulty: 'HARD',
  q: 'What is a stale closure in React hooks? How do you prevent it?',
  whyAsked: 'Advanced React hook pitfall; tests understanding of closure capture and re-render cycles.',
  a: `## Stale Closure in React Hooks

### What Is It?
A closure captures variables at the time it's created. If a callback captures a state variable, it may hold an old ("stale") value even after re-renders update the state.

### Classic Stale Closure Example
\`\`\`jsx
function Counter() {
  const [count, setCount] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      // count is captured at 0 and never updates!
      setCount(count + 1)  // always sets to 0 + 1 = 1
    }, 1000)
    return () => clearInterval(interval)
  }, [])  // Empty deps — closure captures count=0 at mount

  return <div>{count}</div>  // Stays at 1
}
\`\`\`

### Fix 1: Use functional update form (avoids reading stale state)
\`\`\`jsx
useEffect(() => {
  const interval = setInterval(() => {
    setCount(prev => prev + 1)  // React passes current state — no closure issue
  }, 1000)
  return () => clearInterval(interval)
}, [])  // No count dependency needed
\`\`\`

### Fix 2: Add dep to re-create callback (can cause side effects)
\`\`\`jsx
useEffect(() => {
  const interval = setInterval(() => {
    setCount(count + 1)  // Fresh count each time
  }, 1000)
  return () => clearInterval(interval)
}, [count])  // Re-runs on each count change — interval resets each second
\`\`\`

### Fix 3: useRef to always hold latest value
\`\`\`jsx
function Counter() {
  const [count, setCount] = useState(0)
  const countRef = useRef(count)
  countRef.current = count  // sync ref on every render

  useEffect(() => {
    const interval = setInterval(() => {
      setCount(countRef.current + 1)  // always reads latest via ref
    }, 1000)
    return () => clearInterval(interval)
  }, [])
}
\`\`\`

### Fix 4: useCallback with deps (for event handlers)
\`\`\`jsx
function SearchInput({ query, onSearch }) {
  // ❌ Stale: captures old query
  const handleSubmit = useCallback(() => {
    onSearch(query)
  }, [])  // Missing deps

  // ✅ Fresh: re-creates when query changes
  const handleSubmit = useCallback(() => {
    onSearch(query)
  }, [query, onSearch])
}
\`\`\`

### Detecting Stale Closures
- ESLint rule \`react-hooks/exhaustive-deps\` warns when deps are missing
- Always trust the linter — if it asks for a dep, add it or refactor`
},

{
  category: 'TECHNICAL', difficulty: 'HARD',
  q: 'What is tearing in React Concurrent Mode? How does useSyncExternalStore solve it?',
  whyAsked: 'Advanced React 18 concept; tests understanding of concurrent rendering hazards.',
  a: `## Tearing in React Concurrent Mode

### What is Tearing?
Tearing = two parts of the same UI showing **different values for the same data** at the same moment — like a visual "tear."

### Why Concurrent Mode Can Cause Tearing
In React 18 Concurrent Mode, rendering is **interruptible**. React may:
1. Start rendering with data = 10
2. Pause (to handle user input)
3. External store updates: data = 20
4. Resume rendering — but now reads data = 20
5. Result: part of UI shows 10, part shows 20 → **TORN state**

\`\`\`jsx
// Simplified timeline:
// Render Component A → reads store: value=10 → renders "10"
// [React pauses]
// Store updates: value=20
// [React resumes]
// Render Component B → reads store: value=20 → renders "20"
// Screen shows: A="10", B="20" ← TEARING
\`\`\`

### useSyncExternalStore — The Solution (React 18)
Forces synchronous rendering when reading from external stores.

\`\`\`jsx
import { useSyncExternalStore } from 'react'

// For any external store (Redux, Zustand, MobX, custom)
function useMyStore() {
  return useSyncExternalStore(
    store.subscribe,     // (callback) => unsubscribe
    store.getSnapshot,   // () => current state
    store.getServerSnapshot  // optional: for SSR
  )
}

// Custom store example
const store = {
  state: { count: 0 },
  listeners: new Set(),
  subscribe(listener) {
    store.listeners.add(listener)
    return () => store.listeners.delete(listener)
  },
  getSnapshot() {
    return store.state
  },
  update(newState) {
    store.state = newState
    store.listeners.forEach(l => l())
  }
}

function Counter() {
  const { count } = useSyncExternalStore(store.subscribe, store.getSnapshot)
  return <div>{count}</div>
}
\`\`\`

### Who Is Affected?
- Custom event emitters / observables
- Old-style Redux (pre-react-redux v8)
- Any store that React doesn't control

### Modern libraries handle this for you
- **Zustand** v4+ uses \`useSyncExternalStore\` internally
- **react-redux** v8+ uses \`useSyncExternalStore\`
- React's own \`useState\`/\`useReducer\` are inherently tear-safe`
},

{
  category: 'TECHNICAL', difficulty: 'HARD',
  q: 'What are React hydration errors and how do you fix them?',
  whyAsked: 'Next.js SSR fundamental; hydration mismatches are a top source of bugs in SSR apps.',
  a: `## React Hydration Errors in Next.js

### What is Hydration?
SSR sends pre-rendered HTML to the browser. React then "hydrates" it — attaches event listeners and takes over. For this to work, the server-rendered HTML must **exactly match** the client-rendered HTML.

### Common Error
\`\`\`
Error: Hydration failed because the initial UI does not match what was rendered on the server.
Warning: Expected server HTML to contain a matching <div> in <div>.
\`\`\`

### Cause 1: Different content on server vs client
\`\`\`jsx
// ❌ Date.now() differs between server and client render
export default function Page() {
  return <div>Rendered at: {Date.now()}</div>
}

// ✅ Use useEffect for client-only dynamic values
export default function Page() {
  const [time, setTime] = useState(null)
  useEffect(() => setTime(Date.now()), [])
  return <div>Rendered at: {time ?? 'loading...'}</div>
}
\`\`\`

### Cause 2: localStorage/window access on server
\`\`\`jsx
// ❌ window doesn't exist on server
const theme = localStorage.getItem('theme')
return <div className={theme}>...</div>

// ✅ Check for browser environment
const [theme, setTheme] = useState('light')  // default for SSR
useEffect(() => {
  setTheme(localStorage.getItem('theme') || 'light')
}, [])
\`\`\`

### Cause 3: Browser extensions modify HTML
Some browser extensions (password managers, translators) modify DOM before React hydrates. React sees the modified HTML and panics.

### Cause 4: Invalid HTML nesting
\`\`\`jsx
// ❌ <p> cannot contain <div> — browsers auto-correct HTML, causing mismatch
<p><div>content</div></p>

// ✅ Use valid nesting
<div><div>content</div></div>
\`\`\`

### Fix: suppressHydrationWarning (last resort)
\`\`\`jsx
// Only for truly unavoidable mismatches (e.g., timestamp)
<div suppressHydrationWarning>
  {new Date().toLocaleDateString()}
</div>
\`\`\`

### Fix: dynamic() with ssr: false (for purely client-side components)
\`\`\`jsx
import dynamic from 'next/dynamic'

const ClientOnlyMap = dynamic(() => import('./Map'), { ssr: false })
// Component only renders on client — no hydration mismatch possible
\`\`\``
},

// ─── Coding Challenge ─────────────────────────────────────────────────────────
{
  category: 'CODING', difficulty: 'MEDIUM',
  q: 'Implement a useDebounce hook and use it in a live search input.',
  whyAsked: 'Common coding challenge in frontend interviews; tests hooks, closures, and cleanup.',
  a: `## useDebounce Hook Implementation

### The Hook
\`\`\`javascript
// hooks/useDebounce.js
import { useState, useEffect } from 'react'

function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => clearTimeout(timer)  // cleanup cancels previous timer
    // Each new value cancels the previous timer and starts a new one
  }, [value, delay])

  return debouncedValue
}

export default useDebounce
\`\`\`

### Usage in Live Search
\`\`\`jsx
// components/SearchInput.jsx
import { useState, useEffect } from 'react'
import useDebounce from '../hooks/useDebounce'

function SearchInput() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)

  const debouncedQuery = useDebounce(query, 400)  // wait 400ms after user stops typing

  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults([])
      return
    }
    setLoading(true)
    fetch(\`/api/search?q=\${encodeURIComponent(debouncedQuery)}\`)
      .then(res => res.json())
      .then(data => { setResults(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [debouncedQuery])  // only fires when debounced value changes

  return (
    <div>
      <input
        type="text"
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Search..."
      />
      {loading && <p>Loading...</p>}
      <ul>
        {results.map(r => <li key={r.id}>{r.title}</li>)}
      </ul>
    </div>
  )
}
\`\`\`

### useDebounce with callback variant (debouncing functions)
\`\`\`javascript
import { useRef, useCallback } from 'react'

function useDebouncedCallback(fn, delay = 300) {
  const timerRef = useRef(null)

  return useCallback((...args) => {
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => fn(...args), delay)
  }, [fn, delay])
}

// Usage
const handleSearch = useDebouncedCallback((query) => {
  fetchResults(query)
}, 400)

<input onChange={e => handleSearch(e.target.value)} />
\`\`\`

### How It Works (trace for typing "react")
\`\`\`
User types 'r' → timer starts (400ms)
User types 'e' → previous timer cancelled, new timer starts
User types 'a' → timer reset
User types 'c' → timer reset
User types 't' → timer reset
400ms passes → debouncedQuery = "react" → API called once (not 5 times)
\`\`\``
},

// ─── HTML / CSS ───────────────────────────────────────────────────────────────
{
  category: 'TECHNICAL', difficulty: 'EASY',
  q: 'What is semantic HTML? Give examples and explain why it matters.',
  whyAsked: 'Accessibility and SEO fundamental; tests HTML knowledge beyond just divs and spans.',
  a: `## Semantic HTML

**Semantic elements** tell the browser (and tools) what the content means, not just how it looks.

### Non-Semantic vs Semantic
\`\`\`html
<!-- ❌ Non-semantic: all divs and spans -->
<div class="header">
  <div class="nav">
    <div class="nav-item"><a href="/">Home</a></div>
  </div>
</div>
<div class="main-content">
  <div class="article">
    <div class="article-title">My Post</div>
    <div class="article-body">Content here...</div>
  </div>
</div>
<div class="footer">Copyright 2024</div>

<!-- ✅ Semantic: self-describing elements -->
<header>
  <nav>
    <ul>
      <li><a href="/">Home</a></li>
    </ul>
  </nav>
</header>
<main>
  <article>
    <h1>My Post</h1>
    <p>Content here...</p>
  </article>
</main>
<footer>Copyright 2024</footer>
\`\`\`

### Key Semantic Elements
| Element | Meaning |
|---------|---------|
| \`<header>\` | Introductory content / site header |
| \`<nav>\` | Navigation links |
| \`<main>\` | Main content (one per page) |
| \`<article>\` | Self-contained content (blog post, card) |
| \`<section>\` | Thematic grouping with heading |
| \`<aside>\` | Sidebar / tangentially related content |
| \`<footer>\` | Footer of section or page |
| \`<figure>\` | Image with caption (\`<figcaption>\`) |
| \`<time>\` | Date/time with machine-readable datetime attr |
| \`<mark>\` | Highlighted text |
| \`<address>\` | Contact information |

### Why It Matters

**1. Accessibility (Screen Readers)**
\`\`\`html
<nav aria-label="Main navigation">
  <!-- Screen reader announces "Main navigation, navigation landmark" -->
</nav>
<!-- Users can skip to landmarks directly -->
\`\`\`

**2. SEO**
- Search engines weight \`<h1>\` content more than \`<div class="title">\`
- \`<article>\` signals indexable standalone content
- \`<time datetime="2024-01-15">\` enables rich snippets

**3. Maintainability**
- Self-documenting code — no need for class name conventions
- Easier for new developers to understand structure`
},

{
  category: 'TECHNICAL', difficulty: 'MEDIUM',
  q: 'Explain CSS position: static, relative, absolute, fixed, sticky.',
  whyAsked: 'Fundamental CSS layout concept that trips up many developers.',
  a: `## CSS Position Values

### static (default)
Element follows normal document flow. \`top\`/\`left\`/\`right\`/\`bottom\` have NO effect.
\`\`\`css
.box { position: static; top: 10px; }  /* top: 10px is ignored */
\`\`\`

### relative
Element stays in normal flow but can be offset relative to its normal position.
\`\`\`css
.box {
  position: relative;
  top: 10px;  /* moves 10px DOWN from where it would normally be */
  left: 20px; /* moves 20px RIGHT */
}
/* Space is still reserved in normal flow — no layout shift for neighbors */
\`\`\`
**Key use:** Create a positioning context for absolutely positioned children.

### absolute
Removed from normal flow. Positioned relative to nearest **non-static** ancestor.
\`\`\`css
.parent { position: relative; }  /* creates positioning context */
.child {
  position: absolute;
  top: 0; right: 0;  /* top-right corner of .parent */
}
/* If no non-static ancestor found → positioned relative to <html> (initial containing block) */
\`\`\`

### fixed
Removed from flow. Positioned relative to the **viewport** (browser window). Stays on screen during scroll.
\`\`\`css
.navbar {
  position: fixed;
  top: 0; left: 0; right: 0;
  z-index: 100;
}
/* Stays at top even when scrolling */
\`\`\`

### sticky
Hybrid of relative + fixed. Acts like relative until scroll threshold, then "sticks" like fixed.
\`\`\`css
.header {
  position: sticky;
  top: 0;  /* sticks when it reaches 0px from viewport top */
}
/* Stays in normal flow until user scrolls past it */
\`\`\`

### z-index
Controls stack order for positioned elements (not static).
\`\`\`css
/* Higher z-index = closer to viewer */
.modal { position: fixed; z-index: 1000; }
.overlay { position: fixed; z-index: 999; }
\`\`\``
},

{
  category: 'TECHNICAL', difficulty: 'MEDIUM',
  q: 'Flexbox vs CSS Grid — when to use which?',
  whyAsked: 'Core CSS layout question; tests ability to choose right tool for layout problems.',
  a: `## Flexbox vs CSS Grid

### The Core Difference
- **Flexbox:** 1-dimensional layout (either row OR column)
- **Grid:** 2-dimensional layout (rows AND columns simultaneously)

### Flexbox — for 1D layouts
\`\`\`css
/* Navigation bar: items in a row */
.nav {
  display: flex;
  justify-content: space-between;  /* horizontal distribution */
  align-items: center;             /* vertical alignment */
  gap: 16px;
}

/* Card row that wraps */
.cards {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}
.card { flex: 1 1 300px; }  /* grow, shrink, min-basis */

/* Center a single item */
.container {
  display: flex;
  justify-content: center;
  align-items: center;
}
\`\`\`

### Grid — for 2D layouts
\`\`\`css
/* Page layout */
.page {
  display: grid;
  grid-template-columns: 240px 1fr;  /* sidebar + main */
  grid-template-rows: 60px 1fr 40px; /* header + content + footer */
  grid-template-areas:
    "header header"
    "sidebar main"
    "footer footer";
  height: 100vh;
}
.header { grid-area: header; }
.sidebar { grid-area: sidebar; }
.main { grid-area: main; }
.footer { grid-area: footer; }

/* Responsive card grid */
.gallery {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 16px;
}
\`\`\`

### When to use which
| Use case | Tool |
|----------|------|
| Navbar items in a row | Flexbox |
| Centering a single element | Flexbox |
| Items that wrap to multiple rows | Flexbox |
| Page-level layout (header/sidebar/main/footer) | Grid |
| Card grid with alignment across rows | Grid |
| Overlapping elements | Grid (explicit placement) |

### They work together
\`\`\`css
.page { display: grid; }     /* page structure */
.nav { display: flex; }      /* nav items */
.card { display: flex; }     /* card internals */
\`\`\``
},

{
  category: 'TECHNICAL', difficulty: 'EASY',
  q: 'How do you center a div in CSS? List 3 methods.',
  whyAsked: 'Classic interview question testing practical CSS knowledge.',
  a: `## Centering a Div in CSS

### Method 1: Flexbox (most common, modern)
\`\`\`css
.container {
  display: flex;
  justify-content: center;  /* horizontal */
  align-items: center;      /* vertical */
  height: 100vh;            /* container needs height for vertical centering */
}

/* Result: .child is perfectly centered */
\`\`\`

### Method 2: CSS Grid
\`\`\`css
.container {
  display: grid;
  place-items: center;  /* shorthand for align-items + justify-items */
  height: 100vh;
}
\`\`\`

### Method 3: Absolute positioning + transform (works without knowing child size)
\`\`\`css
.container { position: relative; }

.child {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  /* top/left moves the top-left corner to center */
  /* transform pulls it back by half its own size */
}
\`\`\`

### Method 4: Auto margins (horizontal only, or with flex parent)
\`\`\`css
/* Horizontal centering of block element */
.child {
  width: 300px;
  margin: 0 auto;
}

/* In flex container: margin auto pushes equally */
.flex-child {
  margin: auto;  /* centers both horizontally and vertically in flex parent */
}
\`\`\`

### Method 5: Old-school table-cell (for legacy browsers)
\`\`\`css
.container {
  display: table-cell;
  text-align: center;
  vertical-align: middle;
}
\`\`\`

### Which to use?
- **Flexbox** for most cases (responsive, no size needed)
- **Grid** with \`place-items: center\` for single child centering
- **Absolute + transform** when container can't be flex/grid
- **margin: auto** for block elements with known width`
},

// ─── State Management / Patterns ─────────────────────────────────────────────
{
  category: 'TECHNICAL', difficulty: 'MEDIUM',
  q: 'Explain Promise.all, Promise.race, Promise.allSettled, Promise.any.',
  whyAsked: 'Tests async JavaScript mastery — knowing which combinator to use is a practical skill.',
  a: `## Promise Combinators

### Promise.all — all must succeed
\`\`\`javascript
const [user, posts, followers] = await Promise.all([
  fetchUser(id),
  fetchPosts(id),
  fetchFollowers(id)
])
// All 3 run in parallel; rejects immediately if ANY rejects
// Use when: you need ALL results and can't proceed if any fails
\`\`\`

### Promise.allSettled — wait for all, regardless of result
\`\`\`javascript
const results = await Promise.allSettled([
  fetchFromServer1(),
  fetchFromServer2(),
  fetchFromServer3()
])

results.forEach(result => {
  if (result.status === 'fulfilled') console.log('OK:', result.value)
  else console.log('Failed:', result.reason)
})
// Never rejects; gives { status: 'fulfilled'|'rejected', value|reason } for each
// Use when: you want results from ALL even if some fail (reporting, bulk operations)
\`\`\`

### Promise.race — first to settle wins
\`\`\`javascript
// Timeout pattern
const result = await Promise.race([
  fetchData(),
  new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Timeout')), 5000)
  )
])
// Resolves/rejects with whichever settles first
// Use when: you want the fastest response or need a timeout

// Primary + fallback server
const data = await Promise.race([primaryServer(), fallbackServer()])
\`\`\`

### Promise.any — first to SUCCEED wins (ES2021)
\`\`\`javascript
const result = await Promise.any([
  fetchFromCDN1(),
  fetchFromCDN2(),
  fetchFromCDN3()
])
// Resolves with first fulfilled; rejects only if ALL reject (AggregateError)
// Use when: you have multiple sources and want the first working one

try {
  const data = await Promise.any([server1(), server2(), server3()])
} catch (err) {
  // err is AggregateError: all failed
  console.log('All failed:', err.errors)
}
\`\`\`

### Quick Comparison
| Combinator | Resolves when | Rejects when |
|------------|--------------|--------------|
| \`Promise.all\` | ALL fulfill | ANY rejects |
| \`Promise.allSettled\` | ALL settle (never rejects) | — |
| \`Promise.race\` | First settles | First rejects |
| \`Promise.any\` | First fulfills | ALL reject |`
},

{
  category: 'TECHNICAL', difficulty: 'MEDIUM',
  q: 'Redux vs Context API — when to use which for state management?',
  whyAsked: 'State management is a core frontend architecture decision; tests practical judgment.',
  a: `## Redux vs Context API

### Context API — built into React
\`\`\`jsx
// Create context
const ThemeContext = createContext({ mode: 'light', toggle: () => {} })

// Provider wraps the tree
function ThemeProvider({ children }) {
  const [mode, setMode] = useState('light')
  const toggle = () => setMode(m => m === 'light' ? 'dark' : 'light')
  return (
    <ThemeContext.Provider value={{ mode, toggle }}>
      {children}
    </ThemeContext.Provider>
  )
}

// Consume anywhere in the tree
function Header() {
  const { mode, toggle } = useContext(ThemeContext)
  return <button onClick={toggle}>Mode: {mode}</button>
}
\`\`\`

### Redux (with Redux Toolkit) — external state library
\`\`\`javascript
// store/userSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'

export const fetchUser = createAsyncThunk('user/fetch', async (id) => {
  const res = await fetch(\`/api/users/\${id}\`)
  return res.json()
})

const userSlice = createSlice({
  name: 'user',
  initialState: { data: null, loading: false, error: null },
  reducers: {
    logout: (state) => { state.data = null }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUser.pending, (state) => { state.loading = true })
      .addCase(fetchUser.fulfilled, (state, action) => {
        state.loading = false
        state.data = action.payload
      })
      .addCase(fetchUser.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message
      })
  }
})

// Component
function Profile() {
  const { data, loading } = useSelector(state => state.user)
  const dispatch = useDispatch()
  useEffect(() => { dispatch(fetchUser(1)) }, [])
  if (loading) return <Spinner />
  return <div>{data?.name}</div>
}
\`\`\`

### Decision Guide
| Criteria | Context API | Redux (RTK) |
|----------|-------------|-------------|
| Setup complexity | Low | Medium |
| Boilerplate | Minimal | Some (reducers, actions) |
| DevTools | ❌ No | ✅ Redux DevTools |
| Performance (frequent updates) | ⚠️ All consumers re-render | ✅ Selective subscriptions |
| Middleware (logging, async) | Manual | ✅ Built-in (thunk, saga) |
| Time-travel debugging | ❌ | ✅ |
| Best for | Theme, auth, locale | Shopping cart, complex forms, dashboards |

### When to use Context
- Low-frequency updates (theme, user auth, language)
- Small-medium apps
- Data that rarely changes

### When to use Redux
- High-frequency updates from many components
- Complex state logic with many actions
- Need DevTools, time-travel debugging
- Server state with caching → consider **React Query** or **SWR** instead`
},

{
  category: 'TECHNICAL', difficulty: 'MEDIUM',
  q: 'What are React Portals? When would you use them?',
  whyAsked: 'Tests understanding of React\'s render tree vs DOM tree and practical rendering patterns.',
  a: `## React Portals

### What Are Portals?
Portals let you render a component's output into a **different DOM node** than its parent, while keeping it logically inside the React component tree.

\`\`\`jsx
import { createPortal } from 'react-dom'

function Modal({ isOpen, onClose, children }) {
  if (!isOpen) return null
  // Renders children into document.body, not into the parent component's DOM node
  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>,
    document.body  // target DOM node
  )
}

// Usage — Modal renders in <body>, not inside <div class="card">
function Card() {
  const [showModal, setShowModal] = useState(false)
  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      <button onClick={() => setShowModal(true)}>Open Modal</button>
      <Modal isOpen={showModal} onClose={() => setShowModal(false)}>
        <h2>Modal Content</h2>
      </Modal>
    </div>
  )
}
\`\`\`

### Why Do We Need Portals?

**CSS Overflow / z-index Problem:**
\`\`\`html
<!-- Without portal: Modal trapped by overflow:hidden -->
<div class="card" style="overflow:hidden; position:relative; z-index:1">
  <div class="modal">  <!-- clipped by overflow:hidden! -->
  </div>
</div>

<!-- With portal: Modal escapes to <body> -->
<div class="card">...</div>
<div class="modal">...</div>  <!-- sibling of card, not inside it -->
\`\`\`

### Key Property: Events Still Bubble Through React Tree
\`\`\`jsx
function Parent() {
  const handleClick = (e) => {
    // This fires even though Modal renders in document.body!
    // Because events bubble through the React component tree, not DOM tree
    console.log('Click from portal child')
  }
  return (
    <div onClick={handleClick}>
      <Modal>  {/* rendered in body, but events bubble to Parent */}
        <button>Click me</button>
      </Modal>
    </div>
  )
}
\`\`\`

### Common Use Cases
1. **Modals / Dialogs** — escape parent overflow/z-index
2. **Tooltips / Popovers** — position relative to viewport
3. **Notifications / Toast messages** — always on top
4. **Fullscreen components** — need to escape layout containers`
},
]

async function seed() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL env var required')

  const parsed = new URL(url)
  const conn = await mariadb.createConnection({
    host: parsed.hostname,
    port: parseInt(parsed.port) || 3306,
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: parsed.pathname.replace(/^\//, ''),
    ssl: { rejectUnauthorized: false },
    connectTimeout: 20000,
  })

  try {
    const rows = await conn.query(
      'SELECT id FROM `User` WHERE email = ?',
      [USER_EMAIL]
    )
    if (!rows.length) throw new Error(`User ${USER_EMAIL} not found`)
    const userId = rows[0].id
    console.log(`Seeding for userId=${userId}`)

    let inserted = 0
    for (const q of questions) {
      await conn.query(
        `INSERT INTO interview_questions
           (userId, category, question, answer, difficulty, whyAsked, source, practiced, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, 'MANUAL', false, NOW(), NOW())`,
        [userId, q.category, q.q, q.a, q.difficulty, q.whyAsked]
      )
      inserted++
    }
    console.log(`Done — inserted ${inserted} questions`)
  } finally {
    await conn.end()
  }
}

seed().catch(err => { console.error(err); process.exit(1) })
