import { useNavigation, useRoute } from '@react-navigation/native';
import { useEffect, useState } from 'react';
import {
  Text,
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useMoviesDataById } from '../api/video';
import ButtonPlay from '../assets/ButtonPlay';
import VideoPlayer from '../components/VideoPlayer';

const VideoScreen = () => {
  const route = useRoute();
  const { id } = route.params;
  const navigation = useNavigation();

  const [playing, setPlaying] = useState(false);
  const [activeEpisode, setActiveEpisode] = useState<any>(null);

  const { data, isLoading } = useMoviesDataById(id);

  const date = new Date(data?.movie?.createdAt);
  const year = date.getUTCFullYear();

  useEffect(() => {
    setActiveEpisode(data?.movie?.episodes?.[0]);
  }, [data, isLoading]);

  const handlerCreator = (i = 1) => {
    navigation.navigate(
      'Creator' as never,
      { id: data?.movie?.uploader?.id } as never,
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.frame}>
        <View style={styles.videoWrapper}>
          <Text style={{ color: 'white' }}>
            <VideoPlayer
              episode={activeEpisode ?? data?.movie?.episodes?.[0]}
              movie={data?.movie}
              playing={playing}
              setPlaying={setPlaying}
            />
          </Text>
        </View>

        <ScrollView
          style={[styles.rightSection, playing && { opacity: 0.3 }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.movieInfo}>
            <View style={styles.content}>
              <View style={styles.above}>
                <View style={styles.videoQuality}>
                  <Text style={styles.episode}>
                    Episode {activeEpisode?.episodeNo}
                  </Text>
                  <Text style={styles.year}>{year}</Text>
                  <View style={styles.quality}>
                    <Text style={styles.hd}>HD</Text>
                  </View>
                </View>
                <View style={styles.lable}>
                  <Text style={styles.title}> {activeEpisode?.title} </Text>
                </View>
                <Text style={styles.description}>
                  {activeEpisode?.description}{' '}
                </Text>
              </View>
            </View>

            <View style={styles.genres}>
              <View style={styles.creator}>
                <Text style={styles.by}>By</Text>
                <TouchableOpacity
                  onPress={() => handlerCreator()}
                  style={styles.infoCta}
                >
                  <View style={styles.avatarWrapper}>
                    <Image
                      source={{
                        uri:
                          data?.movie?.uploader?.profiles?.[0]?.avatarUrl ??
                          'https://via.placeholder.com/24',
                      }}
                      style={styles.avatar}
                    />
                  </View>
                  <Text style={styles.name}>{data?.movie?.uploader?.name}</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.genresText}>
                Genres: {data?.movie?.genres.map((g: any) => g.name).join(', ')}
              </Text>
            </View>
          </View>
          {data?.movie?.episodes?.length > 0 && (
            <View style={styles.div}>
              <Text style={styles.episodeTitle}>Episodes</Text>
              {data?.movie?.episodes?.map((e: any, index: number) => {
                console.log('e', e);
                return (
                  <View
                    key={index}
                    style={[
                      styles.episodeBox,
                      activeEpisode?.title === e.title &&
                        styles.activeEpisodeBox,
                    ]}
                  >
                    <View style={styles.innerContent}>
                      <View style={styles.numberWrapper}>
                        <Text style={styles.number}>{e.episodeNo}</Text>
                        <TouchableOpacity
                          style={styles.movieCard}
                          onPress={() => !playing && setActiveEpisode(e)}
                        >
                          <Image
                            source={{
                              uri: e.thumbnail,
                            }}
                            style={styles.thumbnail}
                            resizeMode="cover"
                          />

                          <View style={styles.ellipse}>
                            <ButtonPlay width={13} height={13} />
                          </View>
                        </TouchableOpacity>
                      </View>

                      <View style={styles.textWrapper}>
                        <View style={styles.offerWrapper}>
                          <Text style={styles.offerText}>{e.title}</Text>
                          <Text style={styles.minute}>{e.duration} m</Text>
                        </View>
                        <Text style={styles.largeText}>{e.description}</Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      </View>
    </View>
  );
};

export default VideoScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  frame: {
    flexDirection: 'column',
    justifyContent: 'center',
    flex: 1,
    paddingBottom: 20,
  },
  videoWrapper: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    height: 200,
    backgroundColor: '#222',
  },
  rightSection: {
    flex: 1,
    paddingHorizontal: 16,
  },
  movieInfo: {
    backgroundColor: 'rgba(9,9,9,0.28)',
    borderRadius: 15,
    padding: 20,
    marginBottom: 16,
  },
  genres: {
    marginTop: 20,
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 0,
  },
  creator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  infoCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#000',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  avatarWrapper: {
    width: 24,
    height: 24,
    borderRadius: 12,
    overflow: 'hidden',
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  name: {
    fontSize: 12,
    color: '#fff',
    fontFamily: 'HelveticaNowDisplay-Medium',
    fontWeight: 500,
  },
  by: {
    fontSize: 14,
    color: '#777',
    fontFamily: 'HelveticaNowDisplay-Regular',
    fontWeight: 400,
  },
  genresText: {
    fontSize: 14,
    color: '#fff',
    fontFamily: 'HelveticaNowDisplay-Regular',
    fontWeight: 400,
  },
  content: {
    flexDirection: 'column',
  },
  above: {
    flexDirection: 'column',
  },
  videoQuality: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  episode: {
    fontSize: 16,
    color: '#bcbcbc',
    fontFamily: 'HelveticaNowDisplay-Bold',
    fontWeight: 700,
  },
  year: {
    fontSize: 16,
    color: '#bcbcbc',
    marginLeft: 8,
    fontFamily: 'HelveticaNowDisplay-Regular',
    fontWeight: 400,
  },
  quality: {
    borderWidth: 1,
    borderColor: '#808080',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 8,
  },
  hd: {
    fontSize: 11,
    color: '#e5e5e5',
    fontFamily: 'HelveticaNowDisplay-Regular',
    fontWeight: 400,
  },
  lable: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  title: {
    fontSize: 20,

    color: '#fff',
    fontFamily: 'HelveticaNowDisplay-Bold',
    fontWeight: 700,
  },
  description: {
    fontSize: 14,
    color: '#fff',
    marginTop: 8,
    fontFamily: 'HelveticaNowDisplay-Regular',
    fontWeight: 400,
  },
  div: {
    backgroundColor: 'rgba(9,9,9,0.28)',
    borderRadius: 15,
    padding: 20,
    gap: 16,
  },
  episodeTitle: {
    fontSize: 20,
    fontFamily: 'HelveticaNowDisplay-Medium',
    fontWeight: 500,
    color: '#fff',
  },
  episodeBox: {
    padding: 20,
  },
  activeEpisodeBox: {
    backgroundColor: '#222',
  },
  innerContent: {
    flexDirection: 'column',
    justifyContent: 'space-between',
    gap: 14,
  },
  numberWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  number: {
    fontSize: 18,
    color: '#dcdcdc',
    width: 50,
    textAlign: 'center',
    fontFamily: 'HelveticaNowDisplay-Regular',
    fontWeight: 400,
  },
  movieCard: {
    width: 100,
    height: 60,
    borderRadius: 8,
    overflow: 'hidden', // 👈 keeps image rounded
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  ellipse: {
    position: 'absolute', // 👈 sits on top of the image
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.24)',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center', // centers it horizontally
    top: '50%', // vertically centers
    marginTop: -15, // offset half height
  },
  textWrapper: {
    flexDirection: 'column',
    gap: 8,
    flex: 1,
  },
  offerWrapper: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  offerText: {
    fontSize: 16,
    color: '#fff',
    fontFamily: 'HelveticaNowDisplay-Regular',
    fontWeight: 400,
  },
  minute: {
    fontSize: 16,
    fontFamily: 'HelveticaNowDisplay-Regular',
    fontWeight: 400,
    color: '#fff',
  },
  largeText: {
    fontSize: 14,
    fontFamily: 'HelveticaNowDisplay-Regular',
    fontWeight: 400,
    color: '#d2d2d2',
  },
});
